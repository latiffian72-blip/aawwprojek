#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ─── CONFIGURATION & DEVICE ID ────────────────────────────────
const char* SSID = "UDINUS I.4";
const char* PASSWORD = "";

const char* SOCKET_SERVER = "152.42.253.251";  // Backend IP
const uint16_t SOCKET_PORT = 3001;

const char* DEVICE_ID = "esp32_01";
const char* DEVICE_NAME = "ASAP Monitor Tank-01";

WebSocketsClient webSocket;

// ─── OLED ────────────────────────────────────────────────────
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT  64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ─── TURBIDITY ───────────────────────────────────────────────
#define TURBIDITY_PIN 32         
const int TURB_SAMPLES = 20;

unsigned long lastTurbUpdate = 0;
const unsigned long TURB_INTERVAL = 1000UL;

int    turbAdc     = 0;
float  turbVoltage = 0;
String turbKondisi = "---";

// ─── WINSEN DUST SENSOR 1 (Kontrol Pompa) ────────────────────
const int PIN_DUST1 = 32;
unsigned long dust1StartTime = 0;
float dust1Value = 0;

// ─── WINSEN DUST SENSOR 2 (Monitoring) ───────────────────────
const int PIN_DUST2 = 33;
unsigned long dust2StartTime = 0;
float dust2Value = 0;

float  dsmRatio         = 0;
float  dsmConcentration = 0;
String dsmStatus        = "---";

// ─── BME680 (VOC Quality) ──────────────────────────────────────
const int PIN_BME680_PLACEHOLDER = 34; // Sesuaikan dengan SDA/SCL jika I2C
unsigned long lastBmeTime = 0;
const unsigned long bmeInterval = 2000UL; // Kirim status setiap 5 detik

// ─── PWM POMPA (API v3.x) ────────────────────────────────────
const int TRIG1_PIN  = 13;       // GPIO ke TRIG1 modul MOSFET (Q1)
const int TRIG2_PIN  = 14;       // GPIO ke TRIG2 modul MOSFET (Q2, paralel Q1)

const int PWM_FREQ   = 5000;     // 5 kHz — cocok untuk pompa DC brushed
const int PWM_RES    = 8;        // 8-bit: nilai 0–255

const int SPEED_OFF  = 0;
const int SPEED_MIN  = 80;       // ~31% — pompa mulai berputar
const int SPEED_MAX  = 255;      // 100%

// ─── Batas mapping DSM → PWM ─────────────────────────────────
const float DSM_MIN  = 1000.0;   // Di bawah ini pompa OFF
const float DSM_MAX  = 5000.0;   // Di atas ini pompa FULL

int    pumpPWM    = 0;
String pumpStatus = "OFF";
bool   pumpManual = false;       // Flag untuk override kontrol manual dari web

// ─── TIMERS FOR WEBSOCKET ────────────────────────────────────
unsigned long lastStatusUpdate = 0;
const unsigned long STATUS_INTERVAL = 5000UL; // Kirim status setiap 5 detik

// ─────────────────────────────────────────────────────────────
//  SET KECEPATAN POMPA
// ─────────────────────────────────────────────────────────────
void setPumpSpeed(int speed) {
  speed = constrain(speed, SPEED_OFF, SPEED_MAX);
  ledcWrite(TRIG1_PIN, speed);   // API v3.x — langsung pin
  ledcWrite(TRIG2_PIN, speed);
  pumpPWM = speed;

  if      (speed == 0)    pumpStatus = "OFF";
  else if (speed < 128)   pumpStatus = "LOW";
  else if (speed < 220)   pumpStatus = "MED";
  else                    pumpStatus = "FULL";
}

// ─────────────────────────────────────────────────────────────
//  HITUNG PWM DARI KONSENTRASI DSM (ganti potensiometer)
// ─────────────────────────────────────────────────────────────
void updatePumpFromDSM(float conc) {
  if (pumpManual) return; // Jangan ubah jika sedang dalam mode manual dari web
  
  if (conc < DSM_MIN) {
    setPumpSpeed(SPEED_OFF);
  } else {
    int rawPWM = (int)((conc - DSM_MIN) / (DSM_MAX - DSM_MIN) * 255.0f);
    rawPWM     = constrain(rawPWM, 0, 255);
    int speed  = map(rawPWM, 0, 255, SPEED_MIN, SPEED_MAX);
    setPumpSpeed(speed);
  }
}

// ─────────────────────────────────────────────────────────────
//  TURBIDITY
// ─────────────────────────────────────────────────────────────
int readTurbidityADC() {
  long total = 0;
  for (int i = 0; i < TURB_SAMPLES; i++) {
    total += analogRead(TURBIDITY_PIN);
    delay(10);
  }
  return total / TURB_SAMPLES;
}

String getTurbCondition(int adc) {
  if (adc > 950) return "Sgt Jernih";
  if (adc > 850) return "Jernih";
  if (adc > 700) return "Agak Keruh";
  if (adc > 550) return "Keruh";
  return "Sgt Keruh";
}

// ─────────────────────────────────────────────────────────────
//  DSM STATUS
// ─────────────────────────────────────────────────────────────
String getDsmStatus(float conc) {
  if (conc < 1000) return "BERSIH";
  if (conc < 5000) return "SEDANG";
  return "BURUK";
}

// ─────────────────────────────────────────────────────────────
//  UPDATE OLED
// ─────────────────────────────────────────────────────────────
void updateDisplay() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);

  // Baris 1 — Turbidity
  display.setCursor(0, 0);
  display.print("TURB:");
  display.print(turbAdc);
  display.print(" ");
  display.print(turbVoltage, 2);
  display.print("V ");
  display.print(turbKondisi);

  // Baris 2 — BME680 Placeholder
  display.setCursor(0, 11);
  display.print("IAQ : Placeholder");

  // Garis pemisah
  display.drawFastHLine(0, 22, SCREEN_WIDTH, WHITE);

  // Baris 3 — DUST1
  display.setCursor(0, 25);
  display.print("DUST1:");
  display.print(dsmConcentration, 0);
  display.print(" [");
  display.print(dsmStatus);
  display.print("]");

  // Baris 4 — DUST2
  display.setCursor(0, 35);
  display.print("DUST2:");
  display.print(dust2Value, 0);

  // Garis pemisah
  display.drawFastHLine(0, 46, SCREEN_WIDTH, WHITE);

  // Baris 5 — Pompa
  display.setCursor(0, 49);
  display.print("PUMP:");
  display.print(pumpPWM);
  display.print("/255 [");
  display.print(pumpStatus);
  display.print("]");

  // Baris 6 — Bar progress pompa
  int barWidth = map(pumpPWM, 0, 255, 0, SCREEN_WIDTH);
  display.fillRect(0, 59, barWidth, 5, WHITE);
  display.drawRect(0, 59, SCREEN_WIDTH, 5, WHITE);

  display.display();
}

// ─── Fungsi Baca BME680 ───────────────────────────────────────
void sendBme680Reading() {
  // Placeholder untuk pembacaan BME680
  int rawVal = analogRead(PIN_BME680_PLACEHOLDER);
  float iaqValue = map(rawVal, 0, 4095, 0, 500); // Simulasi nilai IAQ 0-500

  StaticJsonDocument<256> doc;
  doc["type"] = "sensor_data";
  doc["deviceId"] = "esp32_01";
  
  JsonArray readings = doc.createNestedArray("readings");
  JsonObject r = readings.createNestedObject();
  r["type"] = "BME680";
  r["value"] = iaqValue;
  r["unit"] = "IAQ";

  String jsonString;
  serializeJson(doc, jsonString);
  webSocket.sendTXT(jsonString);
}

// ─────────────────────────────────────────────────────────────
//  KIRIM DATA SENSOR KE BACKEND (JSON via WebSocket)
// ─────────────────────────────────────────────────────────────
void sendSensorData() {
  if (!webSocket.isConnected()) return;

  DynamicJsonDocument doc(1024);
  doc["type"] = "sensor_data";
  doc["device_id"] = DEVICE_ID;
  
  JsonArray readings = doc.createNestedArray("readings");
  
  JsonObject dust1Reading = readings.createNestedObject();
  dust1Reading["type"] = "DUST1";
  dust1Reading["value"] = dust1Value;
  dust1Reading["unit"] = "ug/m3";

  JsonObject dust2Reading = readings.createNestedObject();
  dust2Reading["type"] = "DUST2";
  dust2Reading["value"] = dust2Value;
  dust2Reading["unit"] = "ug/m3";

  JsonObject turbidityReading = readings.createNestedObject();
  turbidityReading["type"] = "TURBIDITY_ADC";
  turbidityReading["value"] = turbAdc;
  turbidityReading["unit"] = "ADC";

  JsonObject turbidityVoltReading = readings.createNestedObject();
  turbidityVoltReading["type"] = "TURBIDITY_VOLT";
  turbidityVoltReading["value"] = turbVoltage;
  turbidityVoltReading["unit"] = "V";

  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(json);
}

// ─────────────────────────────────────────────────────────────
//  KIRIM STATUS AKTIF POMPA KE BACKEND (JSON via WebSocket)
// ─────────────────────────────────────────────────────────────
void sendStatusUpdate() {
  if (!webSocket.isConnected()) return;

  DynamicJsonDocument doc(512);
  doc["type"] = "status_update";
  doc["device_id"] = DEVICE_ID;
  
  JsonObject components = doc.createNestedObject("components");
  
  JsonObject pump = components.createNestedObject("pump");
  pump["status"] = (pumpPWM > 0) ? "ON" : "OFF";
  pump["load"] = map(pumpPWM, 0, 255, 0, 100);
  pump["speed_text"] = pumpStatus;
  pump["manual"] = pumpManual;

  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(json);
}

// ─────────────────────────────────────────────────────────────
//  WEBSOCKET EVENT HANDLER
// ─────────────────────────────────────────────────────────────
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println(" WebSocket disconnected");
      break;

    case WStype_CONNECTED:
      Serial.println(" WebSocket connected to server");
      break;

    case WStype_TEXT: {
      Serial.println(" Received: " + String((char*)payload));
      
      DynamicJsonDocument doc(256);
      DeserializationError error = deserializeJson(doc, payload, length);
      
      if (!error) {
        String command = doc["command"];
        
        if (command == "PUMP_ON") {
          pumpManual = true;
          setPumpSpeed(SPEED_MAX);
          Serial.println(" Manual Override: PUMP turned ON (FULL)");
        } 
        else if (command == "PUMP_OFF") {
          pumpManual = true;
          setPumpSpeed(SPEED_OFF);
          Serial.println(" Manual Override: PUMP turned OFF");
        } 
        else if (command == "PUMP_AUTO") {
          pumpManual = false;
          // if (pumpMode == PUMP_AUTO) {
          Serial.println(" PUMP control returned to AUTO (DUST1)");
        }

        sendStatusUpdate();
        updateDisplay();
      }
      break;
    }

    case WStype_ERROR:
      Serial.println(" WebSocket error");
      break;
  }
}

// ─────────────────────────────────────────────────────────────
//  MENGELOLA KONEKSI WIFI & WEBSOCKET
// ─────────────────────────────────────────────────────────────
void checkConnection() {
  static unsigned long lastHeartbeat = 0;
  
  // Heartbeat ke WebSocket setiap 30 detik
  if (millis() - lastHeartbeat > 30000) {
    if (webSocket.isConnected()) {
      DynamicJsonDocument doc(128);
      doc["type"] = "heartbeat";
      doc["device_id"] = DEVICE_ID;
      
      String json;
      serializeJson(doc, json);
      webSocket.sendTXT(json);
    }
    lastHeartbeat = millis();
  }

  // Cek Koneksi WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(" WiFi terputus! Reconnecting...");
    WiFi.disconnect();
    WiFi.begin(SSID, PASSWORD);
  }
}

// ─────────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  analogReadResolution(12);
  
  pinMode(PIN_BME680_PLACEHOLDER, INPUT);
  pinMode(PIN_DUST1, INPUT);
  pinMode(PIN_DUST2, INPUT);

  // PWM Pompa — API v3.x
  ledcAttach(TRIG1_PIN, PWM_FREQ, PWM_RES);
  ledcAttach(TRIG2_PIN, PWM_FREQ, PWM_RES);
  setPumpSpeed(SPEED_OFF);

  Wire.begin(21, 22);

  // Inisialisasi OLED
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED gagal!");
    while (true);
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(5, 10);
  display.println("Turb+DUST1+2+BME");
  display.setCursor(5, 25);
  display.println("Connecting WiFi...");
  display.display();

  // Koneksi WiFi
  WiFi.begin(SSID, PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n WiFi Connected!");
  
  display.setCursor(5, 40);
  display.println("WiFi Connected!");
  display.setCursor(5, 50);
  display.print("IP: "); display.println(WiFi.localIP());
  display.display();
  delay(1500);

  // Setup WebSocket
  Serial.println(" Setting up WebSocket...");
  webSocket.begin(SOCKET_SERVER, SOCKET_PORT, "/ws?device_id=" + String(DEVICE_ID));
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  dsmStartTime   = millis();
  lastTurbUpdate = millis();

  Serial.println("Sistem siap. Input pompa: DUST1");
}

// ─────────────────────────────────────────────────────────────
//  LOOP
// ─────────────────────────────────────────────────────────────
void loop() {
  webSocket.loop();
  unsigned long now = millis();

  // ── Sampling DUST1 & DUST2 (non-blocking, tiap 30 detik) ─
  unsigned long durationDust = pulseIn(PIN_DUST1, LOW, 100000UL);
  lowpulseoccupancy += durationDust;

  // ── DUST1: hitung & update pompa setiap 30 detik ─────────
  if ((now - dsmStartTime) >= DSM_SAMPLE_MS) {
    float ratio         = lowpulseoccupancy / (DSM_SAMPLE_MS * 10.0f);
    dust1Value = 1.1f * pow(ratio, 3) - 3.8f * pow(ratio, 2) + 520.0f * ratio + 0.62f;
    // DUST2 placeholder — pembacaan dari sensor kedua (PIN_DUST2)
    dust2Value = analogRead(PIN_DUST2) * (150.0f / 4095.0f);
    dsmStatus  = getDsmStatus(dust1Value);

    // Logika Auto Pompa hanya berdasarkan DUST1
    updatePumpFromDSM(dust1Value);

    lowpulseoccupancy = 0;
    dsmStartTime      = millis();

    Serial.println("===== DUST1 (Kontrol) + PUMP =====");
    Serial.print("Dust1 Konsentrasi : "); Serial.print(dust1Value, 1); Serial.println(" ug/m3");
    Serial.print("Dust2 (Monitor)   : "); Serial.print(dust2Value, 1); Serial.println(" ug/m3");
    Serial.print("Status Debu       : "); Serial.println(dsmStatus);
    Serial.print("PWM Pompa         : "); Serial.print(pumpPWM); Serial.print(" / 255  (");
    Serial.print(map(pumpPWM, 0, 255, 0, 100)); Serial.println("%)");
    Serial.print("Status Pompa      : "); Serial.println(pumpStatus);
    Serial.println("================================");

    updateDisplay();
    sendStatusUpdate();
    sendSensorData();
  }

  // ── BME680: baca setiap 2 detik ──────────────────────────
  if ((now - lastBmeTime) >= bmeInterval) {
    lastBmeTime = millis();
    sendBme680Reading();
  }

  // ── Turbidity: baca setiap 1 detik ───────────────────────
  if ((now - lastTurbUpdate) >= TURB_INTERVAL) {
    turbAdc     = readTurbidityADC();
    turbVoltage = turbAdc * (3.3f / 4095.0f);
    turbKondisi = getTurbCondition(turbAdc);
    lastTurbUpdate = millis();

    Serial.print("[TURBIDITY] ADC: "); Serial.print(turbAdc);
    Serial.print(" | Volt: ");         Serial.print(turbVoltage, 3);
    Serial.print(" V | ");             Serial.println(turbKondisi);

    updateDisplay();
    sendSensorData();
  }

  // ── MQ-7: baca setiap 2 detik ────────────────────────────
  if ((now - lastMQ7Update) >= MQ7_INTERVAL) {
    readMQ7();
    lastMQ7Update = millis();
    updateDisplay();
    sendSensorData();
  }

  // Cek Heartbeat & WiFi reconnect
  checkConnection();
}
