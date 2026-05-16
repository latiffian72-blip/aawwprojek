# 🏗️ ASAP MONITOR - Complete Implementation Plan

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      ASAP MONITOR ECOSYSTEM                      │
└─────────────────────────────────────────────────────────────────┘

FRONTEND (Next.js)
├── Real-time Dashboard
├── Device Control (ON/OFF)
├── Sensor History Charts
└── WebSocket Client

     ↕ WebSocket + REST API
     
BACKEND (Node.js/Express)
├── WebSocket Server (Socket.io)
├── REST API Endpoints
├── Device Command Queue
└── Data Processing

     ↕ Queries
     
DATABASE (PostgreSQL/MongoDB)
├── Sensor Readings (timeseries)
├── Device Status
├── User Sessions
└── Logs & Alerts

     ↕ REST/WebSocket
     
ESP32 Microcontroller
├── Read Sensors (TDS, Turbidity)
├── Read Device Status (Pump, Blower)
├── WebSocket Client (receive commands)
└── GPIO Control (output)
```

---

## 🛠️ Tech Stack

```
Frontend:
  ├── Next.js 14+ (App Router)
  ├── React 18+
  ├── TailwindCSS
  ├── Socket.io-client
  └── Chart.js / Recharts

Backend:
  ├── Node.js 18+
  ├── Express.js
  ├── Socket.io
  ├── axios (for ESP32 communication)
  └── joi (validation)

Database:
  ├── PostgreSQL (timeseries data)
  └── Redis (caching, real-time state)

Microcontroller:
  ├── ESP32
  ├── WebSocketsClient library
  ├── Arduino IDE
  └── Sensor drivers (TDS, Turbidity)
```

---

## 📊 Database Schema

### **1. Sensor Readings Table**
```sql
CREATE TABLE sensor_readings (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,          -- "esp32_01"
  sensor_type VARCHAR(20) NOT NULL,        -- "TDS", "TURBIDITY"
  sensor_value FLOAT NOT NULL,             -- 250.5
  unit VARCHAR(10),                        -- "ppm", "NTU"
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE INDEX idx_readings_device_timestamp 
  ON sensor_readings(device_id, timestamp DESC);
```

### **2. Devices Table**
```sql
CREATE TABLE devices (
  id VARCHAR(50) PRIMARY KEY,              -- "esp32_01"
  name VARCHAR(100) NOT NULL,              -- "Water Monitor Tank-01"
  type VARCHAR(50),                        -- "sensor", "controller"
  ip_address VARCHAR(50),
  status VARCHAR(20) DEFAULT 'OFFLINE',    -- "ONLINE", "OFFLINE"
  last_heartbeat TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **3. Device Status Table** (for pump, blower)
```sql
CREATE TABLE device_status (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  component VARCHAR(50),                   -- "PUMP", "BLOWER"
  status VARCHAR(20),                      -- "ON", "OFF"
  load_percentage FLOAT,                   -- 0-100
  rpm INT,                                 -- for blower
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);
```

### **4. Command Queue Table**
```sql
CREATE TABLE command_queue (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  command VARCHAR(100),                    -- "PUMP_ON", "BLOWER_OFF"
  payload JSON,                            -- {"speed": 50}
  status VARCHAR(20) DEFAULT 'PENDING',    -- "PENDING", "SENT", "ACK"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  executed_at TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);
```

### **5. Alerts Table**
```sql
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  alert_type VARCHAR(50),                  -- "HIGH_TDS", "HIGH_TURBIDITY"
  severity VARCHAR(20),                    -- "WARNING", "CRITICAL"
  message TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);
```

---

## 🔌 REST API Endpoints

### **Device Management**
```
GET    /api/devices                    # List all devices
POST   /api/devices                    # Register new device
GET    /api/devices/:id                # Get device details
PUT    /api/devices/:id                # Update device

GET    /api/devices/:id/heartbeat      # Update last seen (from ESP32)
```

### **Sensor Data**
```
GET    /api/sensors/:device_id         # Get latest readings
GET    /api/sensors/:device_id/history # Get historical data
       ?sensor=TDS&limit=100&hours=24

POST   /api/sensors/:device_id         # POST sensor data (from ESP32)
```

### **Device Commands**
```
GET    /api/commands/:device_id        # Get pending commands (for ESP32)
POST   /api/commands/:device_id        # Send command to device
       {"command": "PUMP_ON"}

PUT    /api/commands/:command_id/ack   # ESP32 acknowledge command
```

### **Device Status**
```
GET    /api/status/:device_id          # Get current status
POST   /api/status/:device_id          # Update status (from ESP32)
```

---

## 🔌 WebSocket Events

### **Server → Client** (Dashboard listen)
```javascript
// Real-time sensor data
socket.on('sensor_update', {
  device_id: "esp32_01",
  sensor_type: "TDS",
  value: 250.5,
  timestamp: "2024-01-15T10:30:00Z"
})

// Device status change
socket.on('device_status', {
  device_id: "esp32_01",
  component: "PUMP",
  status: "ON",
  load: 68
})

// Alert notification
socket.on('alert', {
  id: 123,
  device_id: "esp32_01",
  type: "HIGH_TDS",
  message: "TDS melebihi 500 ppm",
  severity: "CRITICAL"
})

// Device online/offline
socket.on('device_heartbeat', {
  device_id: "esp32_01",
  status: "ONLINE"
})
```

### **Client → Server** (Dashboard sends)
```javascript
// Control device
socket.emit('control_device', {
  device_id: "esp32_01",
  command: "PUMP_ON"
})

socket.emit('control_device', {
  device_id: "esp32_01",
  command: "BLOWER_SET_SPEED",
  payload: { speed: 75 }
})
```

### **ESP32 → Server** (Microcontroller sends)
```javascript
// Send sensor reading
socket.emit('sensor_data', {
  device_id: "esp32_01",
  readings: [
    { type: "TDS", value: 250.5, unit: "ppm" },
    { type: "TURBIDITY", value: 45.2, unit: "NTU" }
  ]
})

// Report device status
socket.emit('status_update', {
  device_id: "esp32_01",
  components: {
    pump: { status: "ON", load: 68 },
    blower: { status: "ON", rpm: 1650, speed: 55 }
  }
})

// Heartbeat / ping
socket.emit('heartbeat', { device_id: "esp32_01" })
```

---

## 📁 Project Structure

```
asap-monitor/
├── frontend/                          # Next.js dashboard
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       └── (API routes if needed)
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── SensorChart.tsx
│   │   ├── DeviceControl.tsx
│   │   └── AlertPanel.tsx
│   ├── hooks/
│   │   ├── useSocket.ts
│   │   └── useSensorData.ts
│   ├── lib/
│   │   └── api-client.ts
│   └── package.json
│
├── backend/                           # Node.js + Express
│   ├── server.ts
│   ├── src/
│   │   ├── routes/
│   │   │   ├── devices.ts
│   │   │   ├── sensors.ts
│   │   │   └── commands.ts
│   │   ├── controllers/
│   │   │   ├── deviceController.ts
│   │   │   ├── sensorController.ts
│   │   │   └── commandController.ts
│   │   ├── models/
│   │   │   ├── Device.ts
│   │   │   ├── Sensor.ts
│   │   │   └── Command.ts
│   │   ├── services/
│   │   │   ├── sensorService.ts
│   │   │   ├── commandService.ts
│   │   │   └── alertService.ts
│   │   ├── websocket/
│   │   │   └── socketHandler.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   └── utils/
│   │       └── validators.ts
│   ├── database/
│   │   ├── migrations/
│   │   └── seeds/
│   └── package.json
│
├── esp32/                             # Arduino firmware
│   ├── asap_monitor_esp32/
│   │   ├── asap_monitor_esp32.ino
│   │   ├── config.h
│   │   ├── sensors.h
│   │   ├── websocket.h
│   │   └── commands.h
│   └── libraries/
│
└── docker-compose.yml                 # If using containers
```

---

## 🔄 Data Flow Diagram

### **Scenario 1: Dashboard Reads Sensor Data**

```
1. ESP32 sends sensor reading via WebSocket
   esp32.emit('sensor_data', {tds: 250, turbidity: 45})
   
2. Backend receives & stores
   - Save to sensor_readings table
   - Update Redis cache
   
3. Backend broadcasts to all connected clients
   socket.broadcast.emit('sensor_update', {...})
   
4. Dashboard receives & updates UI
   - Update gauge
   - Update chart
   - Trigger alerts if threshold exceeded
```

### **Scenario 2: Dashboard Controls Device**

```
1. User clicks "PUMP ON" button in Dashboard
   socket.emit('control_device', {device_id: 'esp32_01', command: 'PUMP_ON'})
   
2. Backend receives command
   - Create entry in command_queue table (status: PENDING)
   - Emit WebSocket to ESP32: 'command'
   
3. ESP32 receives command via WebSocket
   socket.on('command', (cmd) => {
     if (cmd === 'PUMP_ON') digitalWrite(pumpPin, HIGH)
   })
   
4. ESP32 acknowledges
   socket.emit('command_ack', {id: cmd_id, status: 'EXECUTED'})
   
5. Backend updates command_queue (status: ACK)
   - Emit back to Dashboard: 'command_executed'
   
6. Dashboard updates UI
   - Show "PUMP is now ON"
   - Update button state
```

### **Scenario 3: Alert Triggered**

```
1. ESP32 sends sensor data (TDS = 550 ppm) → exceeds threshold (500)

2. Backend processes
   - Detect: 550 > 500 (threshold)
   - Create alert entry
   
3. Backend broadcasts alert to Dashboard + creates log
   socket.emit('alert', {type: 'HIGH_TDS', severity: 'CRITICAL'})
   
4. Dashboard shows
   - Toast notification
   - Add to alert panel
   - Maybe send email/SMS if critical
```

---

## ⚡ Implementation Roadmap

### **Phase 1: Foundation (Week 1)**
- [ ] Setup PostgreSQL + Redis
- [ ] Initialize backend (Express + Socket.io)
- [ ] Create database schema & migrations
- [ ] Implement REST API endpoints

### **Phase 2: ESP32 Firmware (Week 1-2)**
- [ ] Setup WebSocket client on ESP32
- [ ] Implement sensor reading loop
- [ ] Implement command receiver
- [ ] Test local connection

### **Phase 3: Dashboard (Week 2)**
- [ ] Setup Next.js project
- [ ] Implement Socket.io client hook
- [ ] Create sensor display components
- [ ] Create device control UI
- [ ] Connect to backend

### **Phase 4: WebSocket Integration (Week 2-3)**
- [ ] Setup Socket.io server
- [ ] Implement real-time event handlers
- [ ] Add command queue logic
- [ ] Test end-to-end communication

### **Phase 5: Testing & Deployment (Week 3-4)**
- [ ] Integration testing
- [ ] Performance optimization
- [ ] Docker containerization
- [ ] Deploy to production

---

## 🚀 Setup Instructions

### **1. Database Setup**
```bash
# Create PostgreSQL database
createdb asap_monitor

# Run migrations
psql asap_monitor < database/schema.sql

# Optional: seed test data
psql asap_monitor < database/seeds.sql
```

### **2. Backend Setup**
```bash
cd backend
npm install

# Create .env
cat > .env << EOF
DATABASE_URL=postgresql://user:pass@localhost:5432/asap_monitor
REDIS_URL=redis://localhost:6379
PORT=3001
NODE_ENV=development
WEBSOCKET_URL=ws://localhost:3001
EOF

npm run dev
```

### **3. Frontend Setup**
```bash
cd frontend
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
EOF

npm run dev
```

### **4. ESP32 Setup**
```bash
# Install Arduino IDE + ESP32 board support
# Update config.h with WiFi credentials

#define SSID "YOUR_SSID"
#define PASSWORD "YOUR_PASSWORD"
#define SOCKET_SERVER "192.168.x.x"
#define SOCKET_PORT 3001
#define DEVICE_ID "esp32_01"

# Upload sketch to ESP32
```

---

## 🔐 Security Considerations

1. **WebSocket Authentication**
   - Add JWT token to WebSocket connection
   - Validate device ID on backend

2. **HTTPS/WSS in Production**
   - Use Let's Encrypt SSL certificates
   - WebSocket over TLS (WSS)

3. **Input Validation**
   - Validate all API inputs with joi/zod
   - Sanitize commands from users

4. **Rate Limiting**
   - Limit API requests per device
   - Prevent spam commands

5. **Database Security**
   - Use parameterized queries
   - Encrypt sensitive data

---

## 📊 Monitoring & Logging

```javascript
// Backend logging
logger.info(`Device ${device_id} connected`);
logger.warn(`Sensor reading out of range: ${value}`);
logger.error(`Command execution failed: ${error}`);

// Database audit trail
- Track all commands (who, what, when)
- Store all sensor readings for analytics
- Alert history for incident tracking
```

---

## 📈 Future Enhancements

1. **Data Analytics**
   - Trend analysis
   - Predictive maintenance
   - Report generation

2. **Multi-User System**
   - User roles (admin, operator, viewer)
   - Access control per device
   - Activity logging

3. **Mobile App**
   - React Native app
   - Push notifications
   - Offline mode

4. **Advanced Alerts**
   - Email/SMS notifications
   - Slack integration
   - Custom alert rules

5. **Cloud Sync**
   - Backup to cloud storage
   - Multi-site monitoring
   - Remote access

---

## 🎯 Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | Next.js + Socket.io-client | Real-time dashboard & control |
| Backend | Express + Socket.io | API + WebSocket server |
| Database | PostgreSQL | Data persistence |
| Cache | Redis | Session + real-time state |
| ESP32 | Arduino + WebSocket | Sensor reading + GPIO control |

**Result:** Complete IoT monitoring system dengan real-time control! 🚀

---

## 📝 Next Steps

1. Start with Phase 1 (Database + Backend)
2. Once backend is ready, integrate ESP32
3. Build dashboard in parallel
4. Test everything together
5. Deploy!

Good luck! 💪
