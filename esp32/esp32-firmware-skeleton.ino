// ============================================
// ESP32 FIRMWARE SKELETON - Arduino
// ============================================

// asap_monitor_esp32.ino
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// ============================================
// CONFIGURATION
// ============================================

const char* SSID = "UDINUS I.4";
const char* PASSWORD = "";

const char* SOCKET_SERVER = "192.168.1.100";  // Backend IP
const uint16_t SOCKET_PORT = 3001;

const char* DEVICE_ID = "esp32_01";
const char* DEVICE_NAME = "Water Monitor Tank-01";

// Pins
const int TDS_PIN = 34;
const int TURBIDITY_PIN = 35;
const int PUMP_PIN = 12;
const int BLOWER_PIN = 13;

// ============================================
// GLOBAL VARIABLES
// ============================================

WebSocketsClient webSocket;

volatile float tdsValue = 0.0;
volatile float turbidityValue = 0.0;
volatile bool pumpOn = true;
volatile bool blowerOn = true;
volatile int blowerSpeed = 55;

unsigned long lastSensorRead = 0;
unsigned long lastStatusUpdate = 0;
const unsigned long SENSOR_INTERVAL = 1000;  // 1 second
const unsigned long STATUS_INTERVAL = 5000;  // 5 seconds

// ============================================
// SETUP
// ============================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n╔════════════════════════════════════╗");
  Serial.println("║  ASAP MONITOR ESP32 - Initializing  ║");
  Serial.println("╚════════════════════════════════════╝\n");

  // Initialize pins
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(BLOWER_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, HIGH);  // Turn on initially
  digitalWrite(BLOWER_PIN, HIGH);

  // Connect to WiFi
  connectWiFi();

  // Initialize WebSocket
  setupWebSocket();

  Serial.println("\n✅ Setup complete! Waiting for WebSocket connection...\n");
}

// ============================================
// MAIN LOOP
// ============================================

void loop() {
  webSocket.loop();

  // Read sensors every 1 second
  if (millis() - lastSensorRead > SENSOR_INTERVAL) {
    readSensors();
    lastSensorRead = millis();
  }

  // Send status update every 5 seconds
  if (millis() - lastStatusUpdate > STATUS_INTERVAL) {
    sendStatusUpdate();
    lastStatusUpdate = millis();
  }

  // Check for lost connection
  checkConnection();
}

// ============================================
// WiFi CONNECTION
// ============================================

void connectWiFi() {
  Serial.println("🔌 Connecting to WiFi: " + String(SSID));
  WiFi.begin(SSID, PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("📶 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi connection failed!");
  }
}

// ============================================
// WEBSOCKET SETUP
// ============================================

void setupWebSocket() {
  Serial.println("🔌 Setting up WebSocket...");
  
  webSocket.begin(SOCKET_SERVER, SOCKET_PORT, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("❌ WebSocket disconnected");
      break;

    case WStype_CONNECTED: {
      Serial.println("✅ WebSocket connected to server");
      
      // Register device
      DynamicJsonDocument doc(256);
      doc["device_id"] = DEVICE_ID;
      doc["name"] = DEVICE_NAME;
      doc["type"] = "sensor";
      
      String json;
      serializeJson(doc, json);
      webSocket.sendTXT(json);
      break;
    }

    case WStype_TEXT: {
      Serial.println("📨 Received: " + String((char*)payload));
      
      // Parse command
      DynamicJsonDocument doc(256);
      DeserializationError error = deserializeJson(doc, payload, length);
      
      if (!error) {
        String command = doc["command"];
        
        if (command == "PUMP_ON") {
          pumpOn = true;
          digitalWrite(PUMP_PIN, HIGH);
          Serial.println("💧 PUMP turned ON");
        } 
        else if (command == "PUMP_OFF") {
          pumpOn = false;
          digitalWrite(PUMP_PIN, LOW);
          Serial.println("💧 PUMP turned OFF");
        } 
        else if (command == "BLOWER_ON") {
          blowerOn = true;
          digitalWrite(BLOWER_PIN, HIGH);
          Serial.println("💨 BLOWER turned ON");
        } 
        else if (command == "BLOWER_OFF") {
          blowerOn = false;
          digitalWrite(BLOWER_PIN, LOW);
          Serial.println("💨 BLOWER turned OFF");
        }
        else if (command == "BLOWER_SET_SPEED") {
          int speed = doc["payload"]["speed"];
          blowerSpeed = speed;
          // Implement PWM speed control if needed
          Serial.printf("💨 BLOWER speed set to %d%%\n", speed);
        }

        // Send acknowledgment
        DynamicJsonDocument ack(256);
        ack["status"] = "ACK";
        ack["command"] = command;
        
        String ackJson;
        serializeJson(ack, ackJson);
        webSocket.sendTXT(ackJson);
      }
      break;
    }

    case WStype_ERROR:
      Serial.println("❌ WebSocket error");
      break;
  }
}

// ============================================
// SENSOR READING
// ============================================

void readSensors() {
  // Read TDS sensor
  int tdsRaw = analogRead(TDS_PIN);
  float tds = ((tdsRaw / 4095.0) * 1000.0) + 2;
  tdsValue = tds;

  // Read Turbidity sensor
  int turbidityRaw = analogRead(TURBIDITY_PIN);
  float turbidity = (turbidityRaw / 4095.0) * 100.0;
  turbidityValue = turbidity;

  // Print to Serial
  Serial.printf("📥 TDS: %.2f ppm | Turbidity: %.2f NTU\n", tds, turbidity);

  // Send sensor data via WebSocket
  if (webSocket.isConnected()) {
    sendSensorData();
  }
}

void sendSensorData() {
  DynamicJsonDocument doc(256);
  doc["type"] = "sensor_data";
  doc["device_id"] = DEVICE_ID;
  
  JsonArray readings = doc.createNestedArray("readings");
  
  JsonObject tdsReading = readings.createNestedObject();
  tdsReading["type"] = "TDS";
  tdsReading["value"] = tdsValue;
  tdsReading["unit"] = "ppm";
  
  JsonObject turbidityReading = readings.createNestedObject();
  turbidityReading["type"] = "TURBIDITY";
  turbidityReading["value"] = turbidityValue;
  turbidityReading["unit"] = "NTU";

  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(json);
}

// ============================================
// DEVICE STATUS UPDATE
// ============================================

void sendStatusUpdate() {
  if (!webSocket.isConnected()) return;

  DynamicJsonDocument doc(512);
  doc["type"] = "status_update";
  doc["device_id"] = DEVICE_ID;
  
  JsonObject components = doc.createNestedObject("components");
  
  // Pump status
  JsonObject pump = components.createNestedObject("pump");
  pump["status"] = pumpOn ? "ON" : "OFF";
  pump["load"] = pumpOn ? (58 + random(24)) : 0;  // Simulate load
  
  // Blower status
  JsonObject blower = components.createNestedObject("blower");
  blower["status"] = blowerOn ? "ON" : "OFF";
  blower["rpm"] = blowerOn ? (1350 + random(550)) : 0;  // Simulate RPM
  blower["speed"] = blowerOn ? blowerSpeed : 0;

  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(json);

  Serial.printf("📡 Status: Pump=%s Load=%d%% | Blower=%s RPM=%d%%\n",
                pumpOn ? "ON" : "OFF",
                pumpOn ? 68 : 0,
                blowerOn ? "ON" : "OFF",
                blowerSpeed);
}

// ============================================
// CONNECTION MONITORING
// ============================================

void checkConnection() {
  static unsigned long lastHeartbeat = 0;

  // Send heartbeat every 30 seconds
  if (millis() - lastHeartbeat > 30000) {
    if (webSocket.isConnected()) {
      DynamicJsonDocument doc(128);
      doc["type"] = "heartbeat";
      doc["device_id"] = DEVICE_ID;
      
      String json;
      serializeJson(doc, json);
      webSocket.sendTXT(json);
      
      Serial.println("💓 Heartbeat sent");
    }
    lastHeartbeat = millis();
  }

  // Check WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi disconnected! Reconnecting...");
    connectWiFi();
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// For testing: Can add API endpoint to manually trigger commands
void processCommand(String cmd) {
  if (cmd == "PUMP_ON") {
    pumpOn = true;
    digitalWrite(PUMP_PIN, HIGH);
  } 
  else if (cmd == "PUMP_OFF") {
    pumpOn = false;
    digitalWrite(PUMP_PIN, LOW);
  }
  else if (cmd == "BLOWER_ON") {
    blowerOn = true;
    digitalWrite(BLOWER_PIN, HIGH);
  }
  else if (cmd == "BLOWER_OFF") {
    blowerOn = false;
    digitalWrite(BLOWER_PIN, LOW);
  }
}

// ============================================
// NOTES & IMPROVEMENTS
// ============================================

/*
TODO:
1. Add calibration values for TDS sensor
2. Implement EEPROM storage for device config
3. Add fallback HTTP polling if WebSocket fails
4. Implement OTA (Over-The-Air) updates
5. Add SD card logging for data backup
6. Implement PWM for blower speed control
7. Add temperature sensor monitoring
8. Add water level sensor
9. Implement battery backup monitoring
10. Add status LED indicators

PINS USED:
- GPIO 34: Analog input TDS sensor
- GPIO 35: Analog input Turbidity sensor
- GPIO 12: Digital output Pump relay
- GPIO 13: Digital output Blower relay

LIBRARIES NEEDED:
- WebSocketsClient by Markus Sattler
- ArduinoJson by Benoit Blanchon

INSTALLATION:
Sketch → Include Library → Manage Libraries
Search for: WebSocketsClient, ArduinoJson
*/
