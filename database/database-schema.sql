-- ============================================
-- DATABASE SCHEMA - PostgreSQL
-- ============================================

-- Create extensions (if not exists)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- ============================================
-- DEVICES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,                    -- 'sensor', 'controller', 'gateway'
  description TEXT,
  ip_address VARCHAR(50),
  status VARCHAR(20) DEFAULT 'OFFLINE',         -- 'ONLINE', 'OFFLINE', 'ERROR'
  last_heartbeat TIMESTAMP,
  firmware_version VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_type ON devices(type);

-- ============================================
-- SENSOR READINGS TABLE (TimeSeries)
-- ============================================

CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL,
  device_id VARCHAR(50) NOT NULL,
  sensor_type VARCHAR(50) NOT NULL,              -- 'TDS', 'TURBIDITY', 'TEMPERATURE', etc
  sensor_value FLOAT NOT NULL,
  unit VARCHAR(20) NOT NULL,                     -- 'ppm', 'NTU', '°C', etc
  raw_value INT,                                 -- ADC raw value for debugging
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Convert to hypertable if using TimescaleDB
SELECT create_hypertable('sensor_readings', 'timestamp', if_not_exists => TRUE);

CREATE INDEX idx_sensor_readings_device_sensor ON sensor_readings(device_id, sensor_type, timestamp DESC);
CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC);

-- ============================================
-- DEVICE STATUS TABLE (Current State)
-- ============================================

CREATE TABLE IF NOT EXISTS device_status (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL UNIQUE,
  component VARCHAR(50),                        -- 'PUMP', 'BLOWER', 'SYSTEM'
  status VARCHAR(20) NOT NULL,                  -- 'ON', 'OFF', 'ERROR'
  load_percentage FLOAT,                        -- 0-100
  rpm INT,                                      -- for motor devices
  temperature FLOAT,                            -- device temperature
  uptime_seconds BIGINT,                        -- how long running
  power_consumption FLOAT,                      -- watts
  last_command VARCHAR(100),
  last_command_time TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX idx_device_status_updated ON device_status(updated_at DESC);

-- ============================================
-- COMMAND QUEUE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS command_queue (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  command VARCHAR(100) NOT NULL,                -- 'PUMP_ON', 'BLOWER_SET_SPEED', etc
  payload JSONB,                                -- additional parameters
  status VARCHAR(20) DEFAULT 'PENDING',         -- 'PENDING', 'SENT', 'ACK', 'FAILED'
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  executed_at TIMESTAMP,
  
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX idx_commands_device_status ON command_queue(device_id, status);
CREATE INDEX idx_commands_created ON command_queue(created_at DESC);
CREATE INDEX idx_commands_pending ON command_queue(status) WHERE status = 'PENDING';

-- ============================================
-- ALERTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  alert_type VARCHAR(100) NOT NULL,             -- 'HIGH_TDS', 'HIGH_TURBIDITY', 'DEVICE_OFFLINE'
  severity VARCHAR(20) NOT NULL,                -- 'INFO', 'WARNING', 'CRITICAL'
  message TEXT NOT NULL,
  sensor_value FLOAT,
  threshold FLOAT,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX idx_alerts_device_created ON alerts(device_id, created_at DESC);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_resolved ON alerts(is_resolved);

-- ============================================
-- SYSTEM LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS system_logs (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(50),
  log_level VARCHAR(20),                        -- 'INFO', 'WARN', 'ERROR'
  event_type VARCHAR(100),
  message TEXT,
  data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);

CREATE INDEX idx_system_logs_device ON system_logs(device_id);
CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_created ON system_logs(created_at DESC);

-- ============================================
-- THRESHOLD SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS thresholds (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  sensor_type VARCHAR(50) NOT NULL,             -- 'TDS', 'TURBIDITY', etc
  min_value FLOAT,
  warning_value FLOAT,
  critical_value FLOAT,
  max_value FLOAT,
  unit VARCHAR(20),
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(device_id, sensor_type),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- ============================================
-- DEFAULT THRESHOLDS
-- ============================================

INSERT INTO thresholds (device_id, sensor_type, min_value, warning_value, critical_value, max_value, unit)
VALUES
  ('esp32_01', 'TDS', 0, 300, 500, 1000, 'ppm'),
  ('esp32_01', 'TURBIDITY', 0, 40, 60, 100, 'NTU')
ON CONFLICT (device_id, sensor_type) DO NOTHING;

-- ============================================
-- DATA RETENTION VIEWS
-- ============================================

-- View for last 24 hours data
CREATE OR REPLACE VIEW sensor_readings_24h AS
SELECT * FROM sensor_readings
WHERE timestamp > NOW() - INTERVAL '24 hours';

-- View for aggregated hourly data
CREATE OR REPLACE VIEW sensor_readings_hourly AS
SELECT
  device_id,
  sensor_type,
  DATE_TRUNC('hour', timestamp) as hour,
  AVG(sensor_value) as avg_value,
  MIN(sensor_value) as min_value,
  MAX(sensor_value) as max_value,
  COUNT(*) as reading_count
FROM sensor_readings
GROUP BY device_id, sensor_type, DATE_TRUNC('hour', timestamp);

-- View for current device status
CREATE OR REPLACE VIEW device_overview AS
SELECT
  d.id,
  d.name,
  d.type,
  d.status,
  ds.component,
  ds.status as component_status,
  ds.load_percentage,
  ds.updated_at,
  d.last_heartbeat
FROM devices d
LEFT JOIN device_status ds ON d.id = ds.device_id;

-- ============================================
-- CLEANUP POLICIES (if using TimescaleDB)
-- ============================================

-- Keep sensor data for 90 days
-- SELECT add_retention_policy('sensor_readings', INTERVAL '90 days', if_not_exists => true);

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO devices (id, name, type, description)
VALUES
  ('esp32_01', 'Water Monitor Tank-01', 'sensor', 'TDS and Turbidity monitoring')
ON CONFLICT (id) DO NOTHING;

INSERT INTO device_status (device_id, component, status, load_percentage)
VALUES
  ('esp32_01', 'PUMP', 'ON', 68),
  ('esp32_01', 'BLOWER', 'ON', 55)
ON CONFLICT (device_id) DO NOTHING;

-- ============================================
-- USEFUL QUERIES
-- ============================================

/*
-- Get latest sensor readings
SELECT device_id, sensor_type, sensor_value, unit, timestamp
FROM sensor_readings
WHERE device_id = 'esp32_01'
ORDER BY timestamp DESC
LIMIT 10;

-- Get readings for last hour
SELECT * FROM sensor_readings
WHERE device_id = 'esp32_01'
AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;

-- Get hourly averages
SELECT * FROM sensor_readings_hourly
WHERE device_id = 'esp32_01'
ORDER BY hour DESC
LIMIT 24;

-- Get all pending commands
SELECT * FROM command_queue
WHERE status = 'PENDING'
ORDER BY created_at ASC;

-- Get all critical alerts
SELECT * FROM alerts
WHERE severity = 'CRITICAL' AND is_resolved = FALSE
ORDER BY created_at DESC;

-- Get device health
SELECT
  d.id,
  d.name,
  d.status,
  COUNT(sr.id) as readings_count,
  MAX(sr.timestamp) as last_reading,
  AVG(EXTRACT(EPOCH FROM (NOW() - sr.timestamp))) as avg_age_seconds
FROM devices d
LEFT JOIN sensor_readings sr ON d.id = sr.device_id
  AND sr.timestamp > NOW() - INTERVAL '24 hours'
GROUP BY d.id, d.name, d.status;

-- Cleanup old alerts
DELETE FROM alerts
WHERE created_at < NOW() - INTERVAL '30 days'
AND is_resolved = TRUE;

-- Cleanup old logs
DELETE FROM system_logs
WHERE created_at < NOW() - INTERVAL '7 days';
*/

-- ============================================
-- END OF SCHEMA
-- ============================================
