#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// -------------------- Wi-Fi --------------------
const char WIFI_SSID[] = "YOUR_WIFI_NAME";
const char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";

// Public HydroPulse app URL. Use the app domain, not the PostgreSQL domain.
// Example: https://your-public-amvera-domain.amvera.io/api/measurements
const char API_URL[] = "https://YOUR_HYDROPULSE_DOMAIN/api/measurements";

// -------------------- Serial link from base station --------------------
// BASE_STATION.ino uses Serial.begin(9600), so ESP32 UART must match it.
const unsigned long BASE_STATION_BAUD = 9600;

// ESP32 UART2 pins.
// Connect base station TX -> ESP32 GPIO16 through a voltage divider if base station is 5V.
// ESP32 TX is not required for one-way data, but it is configured for completeness.
const int BASE_STATION_RX_PIN = 16;
const int BASE_STATION_TX_PIN = 17;

// -------------------- Retry and timeouts --------------------
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 5000UL;
const unsigned long HTTP_TIMEOUT_MS = 10000UL;

HardwareSerial BaseStationSerial(2);

unsigned long lastWifiTryMillis = 0;
String inputLine = "";
String lastPacketKey = "";

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("HydroPulse ESP32 Serial WiFi Bridge");

  BaseStationSerial.begin(
    BASE_STATION_BAUD,
    SERIAL_8N1,
    BASE_STATION_RX_PIN,
    BASE_STATION_TX_PIN
  );

  connectWiFi();
  Serial.println("Waiting for DATA lines from base station...");
}

void loop() {
  ensureWiFi();
  readBaseStationSerial();
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

void readBaseStationSerial() {
  while (BaseStationSerial.available() > 0) {
    const char c = (char)BaseStationSerial.read();

    if (c == '\r') {
      continue;
    }

    if (c == '\n') {
      inputLine.trim();

      if (inputLine.length() > 0) {
        handleBaseStationLine(inputLine);
      }

      inputLine = "";
      continue;
    }

    if (inputLine.length() < 200) {
      inputLine += c;
    } else {
      Serial.println("Serial line is too long. Resetting buffer.");
      inputLine = "";
    }
  }
}

void handleBaseStationLine(const String &line) {
  Serial.print("Base station: ");
  Serial.println(line);

  if (!line.startsWith("DATA;")) {
    return;
  }

  String sensorId;
  String packetIdText;
  String distanceText;
  String hopText;
  String rssiText;
  String snrText;

  if (!parseDataLine(line, sensorId, packetIdText, distanceText, hopText, rssiText, snrText)) {
    Serial.println("Invalid DATA format. Expected DATA;sensor_id;packet_id;distance_cm;hop_count;rssi;snr");
    Serial.println("--------------------");
    return;
  }

  const String packetKey = sensorId + ";" + packetIdText;
  if (packetKey == lastPacketKey) {
    Serial.println("Duplicate DATA line skipped");
    Serial.println("--------------------");
    return;
  }

  lastPacketKey = packetKey;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi is not connected. DATA line was received but not sent.");
    Serial.println("--------------------");
    return;
  }

  sendMeasurement(sensorId, packetIdText, distanceText, hopText, rssiText, snrText);
  Serial.println("--------------------");
}

bool parseDataLine(
  const String &line,
  String &sensorId,
  String &packetIdText,
  String &distanceText,
  String &hopText,
  String &rssiText,
  String &snrText
) {
  const int p0 = line.indexOf(';');
  const int p1 = line.indexOf(';', p0 + 1);
  const int p2 = line.indexOf(';', p1 + 1);
  const int p3 = line.indexOf(';', p2 + 1);
  const int p4 = line.indexOf(';', p3 + 1);
  const int p5 = line.indexOf(';', p4 + 1);

  if (p0 == -1 || p1 == -1 || p2 == -1 || p3 == -1 || p4 == -1 || p5 == -1) {
    return false;
  }

  sensorId = line.substring(p0 + 1, p1);
  packetIdText = line.substring(p1 + 1, p2);
  distanceText = line.substring(p2 + 1, p3);
  hopText = line.substring(p3 + 1, p4);
  rssiText = line.substring(p4 + 1, p5);
  snrText = line.substring(p5 + 1);

  sensorId.trim();
  packetIdText.trim();
  distanceText.trim();
  hopText.trim();
  rssiText.trim();
  snrText.trim();

  return sensorId.length() > 0 && distanceText.length() > 0;
}

bool sendMeasurement(
  const String &sensorId,
  const String &packetIdText,
  const String &distanceText,
  const String &hopText,
  const String &rssiText,
  const String &snrText
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
  payload += rssiText.toInt();
  payload += ",\"snr\":";
  payload += snrText.toFloat();
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
