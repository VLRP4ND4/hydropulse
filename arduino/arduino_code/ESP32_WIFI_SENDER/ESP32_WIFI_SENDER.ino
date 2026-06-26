#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// -------------------- Wi-Fi --------------------
const char WIFI_SSID[] = "YOUR_WIFI_NAME";
const char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";

// Public HydroPulse app URL. Example:
// https://your-public-amvera-domain.amvera.io/api/measurements
const char API_URL[] = "https://YOUR_HYDROPULSE_DOMAIN/api/measurements";

// -------------------- Ultrasonic sensor --------------------
// Use real ESP32 GPIO numbers, not board labels.
// HC-SR04 ECHO is usually 5V. Use a voltage divider before ESP32 ECHO pin.
const int TRIGGER_PIN = 5;
const int ECHO_PIN = 18;

// Sensor ID must exist in the HydroPulse database table "sensors".
const char SENSOR_ID[] = "002";

// -------------------- Measurements --------------------
const int NUM_MEASUREMENTS = 10;
const unsigned long MEASUREMENT_INTERVAL_MS = 10UL * 1000UL;
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 5000UL;
const unsigned long HTTP_TIMEOUT_MS = 10000UL;

unsigned long packetId = 0;
unsigned long lastMeasurementMillis = 0;
unsigned long lastWifiTryMillis = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIGGER_PIN, LOW);

  Serial.println();
  Serial.println("HydroPulse ESP32 WiFi Sender");
  connectWiFi();
}

void loop() {
  ensureWiFi();

  const unsigned long now = millis();
  if (now - lastMeasurementMillis < MEASUREMENT_INTERVAL_MS) {
    delay(50);
    return;
  }

  lastMeasurementMillis = now;

  const float distanceCm = measureAverageDistance();
  Serial.print("Distance cm: ");
  Serial.println(distanceCm, 2);

  if (distanceCm < 0) {
    Serial.println("Invalid distance. Measurement was not sent.");
    Serial.println("--------------------");
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi is not connected. Measurement was not sent.");
    Serial.println("--------------------");
    return;
  }

  if (sendMeasurement(distanceCm)) {
    packetId++;
  }

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

float measureDistance(int triggerPin, int echoPin) {
  digitalWrite(triggerPin, LOW);
  delayMicroseconds(2);

  digitalWrite(triggerPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(triggerPin, LOW);

  const unsigned long durationMicroseconds = pulseIn(echoPin, HIGH, 30000UL);
  if (durationMicroseconds == 0) {
    return -1.0;
  }

  return durationMicroseconds / 58.0;
}

float measureAverageDistance() {
  float measurements[NUM_MEASUREMENTS];
  int validCount = 0;

  for (int i = 0; i < NUM_MEASUREMENTS; i++) {
    const float distance = measureDistance(TRIGGER_PIN, ECHO_PIN);

    Serial.print("Measurement ");
    Serial.print(i + 1);
    Serial.print(": ");
    Serial.println(distance, 2);

    if (distance > 0) {
      measurements[validCount] = distance;
      validCount++;
    }

    delay(250);
  }

  if (validCount < 3) {
    return -1.0;
  }

  return trimmedMean(measurements, validCount);
}

float trimmedMean(float data[], int size) {
  for (int i = 0; i < size - 1; i++) {
    for (int j = 0; j < size - i - 1; j++) {
      if (data[j] > data[j + 1]) {
        const float temp = data[j];
        data[j] = data[j + 1];
        data[j + 1] = temp;
      }
    }
  }

  int start = 0;
  int end = size;

  if (size >= 5) {
    start = 1;
    end = size - 1;
  }

  float sum = 0.0;
  int count = 0;

  for (int i = start; i < end; i++) {
    sum += data[i];
    count++;
  }

  return count > 0 ? sum / count : -1.0;
}

bool sendMeasurement(float distanceCm) {
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
  payload += SENSOR_ID;
  payload += "\",\"packet_id\":";
  payload += String(packetId);
  payload += ",\"distance_cm\":";
  payload += String(distanceCm, 2);
  payload += ",\"hop_count\":0";
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
