# 🚀 ASAP MONITOR - Quick Start Guide

## 📦 Files Created

Saya sudah buat 5 file skeleton untuk kamu:

1. **IMPLEMENTATION_PLAN.md** - Master plan lengkap
2. **backend-skeleton.ts** - Node.js + Express + Socket.io
3. **frontend-skeleton.tsx** - Next.js dashboard components
4. **esp32-firmware-skeleton.ino** - Arduino ESP32 firmware
5. **database-schema.sql** - PostgreSQL schema

---

## ⚡ Quick Start (15 minutes)

### **Step 1: Setup Database**

```bash
# Install PostgreSQL (if not installed)
# macOS
brew install postgresql@15

# Ubuntu
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
brew services start postgresql  # macOS
sudo service postgresql start   # Ubuntu

# Create database
createuser asap_user -P         # Password: asap_monitor
createdb -O asap_user asap_monitor

# Load schema
psql -U asap_user -d asap_monitor < database-schema.sql

# Verify
psql -U asap_user -d asap_monitor
\dt  # List tables
\q   # Exit
```

### **Step 2: Setup Backend**

```bash
# Create backend project
mkdir asap-monitor-backend
cd asap-monitor-backend

# Initialize Node project
npm init -y

# Install dependencies
npm install express socket.io pg redis cors dotenv
npm install -D typescript @types/express @types/node ts-node

# Create src directory
mkdir src

# Copy backend code from backend-skeleton.ts to src/server.ts
# (Manually copy or use provided code)

# Create .env
cat > .env << 'EOF'
DATABASE_URL=postgresql://asap_user:asap_monitor@localhost:5432/asap_monitor
REDIS_URL=redis://localhost:6379
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
EOF

# Run server
npx ts-node src/server.ts
# Output: 🚀 Server running on port 3001
```

### **Step 3: Setup Frontend**

```bash
# Create Next.js project
npx create-next-app@latest asap-monitor-frontend --typescript --tailwind

cd asap-monitor-frontend

# Install Socket.io client
npm install socket.io-client

# Install additional libraries
npm install chart.js react-chartjs-2  # optional, untuk grafik

# Create .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
EOF

# Copy components from frontend-skeleton.tsx
# Organize as:
# - hooks/useSocket.ts
# - hooks/useSensorData.ts
# - components/Dashboard.tsx
# - components/SensorPanel.tsx
# - components/DeviceControlPanel.tsx
# - components/AlertPanel.tsx
# - app/page.tsx

# Run frontend
npm run dev
# Visit http://localhost:3000
```

### **Step 4: Setup ESP32**

```bash
# Download Arduino IDE
# https://www.arduino.cc/en/software

# Install ESP32 Board:
# Arduino IDE → Preferences → Additional Boards Manager URLs
# https://espressif.github.io/arduino-esp32/package_esp32_index.json

# Then: Tools → Board → Boards Manager → Search "esp32" → Install

# Install required libraries:
# Sketch → Include Library → Manage Libraries
# Search and install:
# - WebSocketsClient (by Markus Sattler)
# - ArduinoJson (by Benoit Blanchon)

# Copy esp32-firmware-skeleton.ino content
# Edit config (WiFi SSID, Backend IP, etc)

# const char* SSID = "YOUR_WIFI_SSID";
# const char* PASSWORD = "YOUR_PASSWORD";
# const char* SOCKET_SERVER = "192.168.1.100";  // Your backend IP

# Connect ESP32 via USB
# Select: Tools → Board → ESP32 Dev Module
# Select: Tools → Port → /dev/ttyUSB0 (or COM port on Windows)

# Upload sketch
# Click Upload button

# Monitor serial output
# Tools → Serial Monitor (baud: 115200)
```

---

## 🔄 Testing Flow

### **1. Check Database**
```bash
# Terminal 1: Monitor PostgreSQL
psql -U asap_user -d asap_monitor

# Check tables
SELECT * FROM devices;
SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 5;
SELECT * FROM command_queue WHERE status = 'PENDING';
```

### **2. Check Backend**
```bash
# Terminal 2: Start backend
cd asap-monitor-backend
npx ts-node src/server.ts

# Expected output:
# 🚀 Server running on port 3001
# 📡 WebSocket ready
```

### **3. Check Frontend**
```bash
# Terminal 3: Start frontend
cd asap-monitor-frontend
npm run dev

# Open browser: http://localhost:3000
# Status should show: 🟢 CONNECTED
```

### **4. Check ESP32**
```
# Terminal 4: Monitor ESP32
# Arduino IDE → Tools → Serial Monitor

# Expected output:
╔════════════════════════════════════╗
║  ASAP MONITOR ESP32 - Initializing  ║
╚════════════════════════════════════╝

✅ WiFi Connected!
✅ WebSocket connected to server

📥 TDS: 250.50 ppm | Turbidity: 45.25 NTU
💓 Heartbeat sent
```

---

## 🧪 Test Scenarios

### **Test 1: Sensor Data Flow**
```
1. ESP32 reads sensors → sends via WebSocket
2. Backend receives → saves to database
3. Backend broadcasts → Dashboard updates in real-time
4. Check database: SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 1;
```

### **Test 2: Device Control**
```
1. Click "PUMP ON" button in Dashboard
2. WebSocket sends command to Backend
3. Backend queues command → sends to ESP32
4. ESP32 receives → toggles GPIO 12 → PUMP ON
5. ESP32 sends acknowledgment
6. Dashboard updates button state ✅
```

### **Test 3: Alerts**
```
1. ESP32 reads TDS = 550 ppm (> threshold 500)
2. Backend detects anomaly → creates alert in DB
3. Backend broadcasts alert → Dashboard shows toast
4. Check database: SELECT * FROM alerts ORDER BY created_at DESC LIMIT 1;
```

---

## 📊 Database Monitoring

### **Useful PostgreSQL Queries**

```sql
-- Current device status
SELECT * FROM device_overview;

-- Last 10 sensor readings
SELECT device_id, sensor_type, sensor_value, unit, timestamp 
FROM sensor_readings 
ORDER BY timestamp DESC 
LIMIT 10;

-- Hourly average for TDS
SELECT * FROM sensor_readings_hourly 
WHERE sensor_type = 'TDS' 
ORDER BY hour DESC 
LIMIT 24;

-- Pending commands
SELECT * FROM command_queue 
WHERE status = 'PENDING' 
ORDER BY created_at ASC;

-- Active alerts
SELECT * FROM alerts 
WHERE is_resolved = FALSE 
ORDER BY created_at DESC;

-- Device health check
SELECT 
  d.id,
  d.name,
  d.status,
  d.last_heartbeat,
  ROUND(EXTRACT(EPOCH FROM (NOW() - d.last_heartbeat))/60, 2) as minutes_since_heartbeat
FROM devices d
ORDER BY d.last_heartbeat DESC;
```

---

## 🔧 Troubleshooting

### **ESP32 not connecting to WebSocket**
```
1. Check WiFi SSID & password correct
2. Check backend IP address correct
3. Check port 3001 is accessible: telnet 192.168.1.100 3001
4. Check firewall not blocking
5. Monitor Serial: should show ✅ WebSocket connected
```

### **Dashboard shows "DISCONNECTED"**
```
1. Check backend is running: curl http://localhost:3001
2. Check Socket.io URL in .env.local
3. Check browser console for errors (F12)
4. Try hard refresh (Ctrl+Shift+R)
```

### **Database connection error**
```
1. Check PostgreSQL running: psql -U asap_user -d asap_monitor
2. Check .env DATABASE_URL correct
3. Check credentials match
4. Check database exists: createdb asap_monitor (if needed)
```

### **Commands not executing on ESP32**
```
1. Check command_queue table: has PENDING status?
2. Check ESP32 Serial Monitor for "Received" message
3. Check command format matches handler
4. Try manual command via Serial Monitor:
   Serial.println("PUMP_ON");
```

---

## 📈 Next Steps After Setup

1. **Customize Sensor Thresholds**
   ```sql
   UPDATE thresholds SET critical_value = 450 
   WHERE device_id = 'esp32_01' AND sensor_type = 'TDS';
   ```

2. **Add More Devices**
   ```sql
   INSERT INTO devices (id, name, type)
   VALUES ('esp32_02', 'Water Monitor Tank-02', 'sensor');
   ```

3. **Implement Historical Data Export**
   - Add CSV/JSON export endpoint

4. **Setup Email Alerts**
   - Use SendGrid/Nodemailer for critical alerts

5. **Add Mobile App**
   - React Native version of dashboard

6. **Cloud Deployment**
   - Deploy to Heroku/Railway/AWS
   - Use managed PostgreSQL service

---

## 📚 Project Structure After Setup

```
asap-monitor/
├── asap-monitor-frontend/          # Next.js dashboard
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── .env.local
│   └── package.json
│
├── asap-monitor-backend/           # Node.js server
│   ├── src/
│   │   └── server.ts
│   ├── .env
│   ├── tsconfig.json
│   └── package.json
│
├── esp32-firmware/                 # Arduino sketch
│   └── asap_monitor_esp32.ino
│
└── database/
    └── schema.sql
```

---

## ✨ Features Checklist

- [ ] Database schema created
- [ ] Backend server running
- [ ] WebSocket events working
- [ ] Frontend dashboard displaying
- [ ] ESP32 connecting to backend
- [ ] Sensor data flowing to database
- [ ] Real-time updates in dashboard
- [ ] Device control buttons working
- [ ] Alerts triggering
- [ ] Commands acknowledged

---

## 🎯 Success Criteria

✅ Backend starts without errors
✅ Frontend loads at localhost:3000
✅ Dashboard shows "🟢 CONNECTED"
✅ ESP32 connects and sends heartbeat
✅ Sensor readings appear in real-time
✅ Click pump button → pump toggles
✅ Database has sensor entries
✅ Alerts appear when threshold exceeded

---

## 📞 Support & Resources

- Socket.io docs: https://socket.io/docs/
- PostgreSQL docs: https://www.postgresql.org/docs/
- Arduino ESP32: https://docs.espressif.com/
- Next.js: https://nextjs.org/docs
- Express: https://expressjs.com/

---

**Happy coding! 🚀**

Jika ada yang tidak jelas, tanya aja! 💪
