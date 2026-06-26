#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// -------------------- Wi-Fi --------------------
const char WIFI_SSID[] = "YOUR_WIFI_NAME";
const char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";

// Public HydroPulse app URL. Use the app domain, not the PostgreSQL domain.
// Example: https://your-public-amvera-domain.amvera.io/api/measurements
const char API_URL[] = "https://YOUR_HYDROPULSE_DOMAIN/api/measurements";

// -------------------- LoRa SX127x pins for ESP32 --------------------
// Change these GPIO numbers to match your wiring.
const int LORA_SCK_PIN = 18;
const int LORA_MISO_PIN = 19;
const int LORA_MOSI_PIN = 23;
const int LORA_CS_PIN = 5;      // NSS / CS
const int LORA_RESET_PIN = 14;  // RST
const int LORA_IRQ_PIN = 2;     // DIO0

const long LORA_FREQUENCY = 433E6;

// -------------------- Retry and dedupe --------------------
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 5000UL;
const unsigned long LORA_RETRY_INTERVAL_MS = 5000UL;
const unsigned long HTTP_TIMEOUT_MS = 10000UL;

unsigned long lastWifiTryMillis = 0;
unsigned long lastLoraTryMillis = 0;
bool loraInitialized = false;

String lastPacketKey = "";

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("HydroPulse ESP32 LoRa WiFi Gateway");

  connectWiFi();

  SPI.begin(LORA_SCK_PIN, LORA_MISO_PIN, LORA_MOSI_PIN, LORA_CS_PIN);
  LoRa.setPins(LORA_CS_PIN, LORA_RESET_PIN, LORA_IRQ_PIN);
}

void loop() {
  ensureWiFi();
  ensureLoRa();

  if (!loraInitialized) {
    delay(50);
    return;
  }

  const int packetSize = LoRa.parsePacket();
  if (packetSize == 0) {
    delay(10);
    return;
  }

  String message = "";
  while (LoRa.available()) {
    message += (char)LoRa.read();
  }
  message.trim();

  Serial.print("Raw LoRa packet: ");
  Serial.println(message);

  String sensorId;
  String packetIdText;
  String distanceText;
  String hopText;

  if (!parsePacket(message, sensorId, packetIdText, distanceText, hopText)) {
    Serial.println("Invalid packet format. Expected: sensor_id;packet_id;distance_cm;hop_count");
    Serial.println("--------------------");
    return;
  }

  const String packetKey = sensorId + ";" + packetIdText;
  if (packetKey == lastPacketKey) {
    Serial.println("Duplicate packet skipped");
    Serial.println("--------------------");
    return;
  }

  lastPacketKey = packetKey;

  const int rssi = LoRa.packetRssi();
  const float snr = LoRa.packetSnr();

  Serial.print("Sensor ID: ");
  Serial.println(sensorId);
  Serial.print("Packet ID: ");
  Serial.println(packetIdText);
  Serial.print("Distance cm: ");
  Serial.println(distanceText);
  Serial.print("Hop count: ");
  Serial.println(hopText);
  Serial.print("RSSI: ");
  Serial.println(rssi);
  Serial.print("SNR: ");
  Serial.println(snr, 2);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi is not connected. Packet was received but not sent to API.");
    Serial.println("--------------------");
    return;
  }

  sendMeasurement(sensorId, packetIdText, distanceText, hopText, rssi, snr);
  Serial.println("--------------------");
}

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 15000UL) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection failed. Will retry in loop.");
  }
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  const unsigned long now = millis();
  if (now - lastWifiTryMillis < WIFI_RECONNECT_INTERVAL_MS) {
    return;
  }

  lastWifiTryMillis = now;
  Serial.println("WiFi disconnected. Reconnecting...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void ensureLoRa() {
  if (loraInitialized) {
    return;
  }

  const unsigned long now = millis();
  if (now - lastLoraTryMillis < LORA_RETRY_INTERVAL_MS) {
    return;
  }

  lastLoraTryMillis = now;
  Serial.println("Trying to initialize LoRa...");

  if (LoRa.begin(LORA_FREQUENCY)) {
    configureLoRa();
    loraInitialized = true;
    Serial.println("LoRa init OK. Waiting for packets...");
  } else {
    Serial.println("LoRa init failed. Will retry.");
  }
}

void configureLoRa() {
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setSyncWord(0x12);
  LoRa.enableCrc();
  LoRa.setTxPower(10);
}

bool parsePacket(
  const String &message,
  String &sensorId,
  String &packetIdText,
  String &distanceText,
  String &hopText
) {
  const int p1 = message.indexOf(';');
  const int p2 = message.indexOf(';', p1 + 1);
  const int p3 = message.indexOf(';', p2 + 1);

  if (p1 == -1 || p2 == -1 || p3 == -1) {
    return false;
  }

  sensorId = message.substring(0, p1);
  packetIdText = message.substring(p1 + 1, p2);
  distanceText = message.substring(p2 + 1, p3);
  hopText = message.substring(p3 + 1);

  sensorId.trim();
  packetIdText.trim();
  distanceText.trim();
  hopText.trim();

  return sensorId.length() > 0 && distanceText.length() > 0;
}

bool sendMeasurement(
  const String &sensorId,
  const String &packetIdText,
  const String &distanceText,
  const String &hopText,
  int rssi,
  float snr
) {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);

  if (!http.begin(client, API_URL)) {
    Serial.println("HTTP begin failed.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"sensor_id\":\"";
  payload += sensorId;
  payload += "\",\"packet_id\":";
  payload += packetIdText.toInt();
  payload += ",\"distance_cm\":";
  payload += distanceText.toFloat();
  payload += ",\"hop_count\":";
  payload += hopText.toInt();
  payload += ",\"rssi\":";
  payload += rssi;
  payload += ",\"snr\":";
  payload += String(snr, 2);
  payload += "}";

  Serial.print("POST ");
  Serial.println(API_URL);
  Serial.print("Payload: ");
  Serial.println(payload);

  const int httpCode = http.POST(payload);
  const String response = http.getString();

  Serial.print("HTTP code: ");
  Serial.println(httpCode);
  Serial.print("Response: ");
  Serial.println(response);

  http.end();

  return httpCode >= 200 && httpCode < 300;
}
