#include <SPI.h>
#include <LoRa.h>

// -------------------- Настройки ультразвукового датчика --------------------
const int triggerPin = 3;
const int echoPin = 4;
const String SENSOR_ID = "001";

// -------------------- Настройки LoRa --------------------
const int loraCsPin = 10;    // CS/NSS
const int loraResetPin = 9;  // RST
const int loraIrqPin = 2;    // DIO0
const long loraFrequency = 433E6;

// -------------------- Настройки измерений --------------------
const int numMeasurements = 10;
const unsigned long measurementInterval = 1 * 1000UL; // 30 секунд между измерениями
unsigned long lastMeasurementMillis = 0;

// -------------------- Настройки повторной инициализации LoRa --------------------
unsigned long lastTryMillis = 0;
const unsigned long retryInterval = 5000; // 5 секунд между попытками
bool loraInitialized = false;

void setup() {
  Serial.begin(9600);
  delay(1000);

  pinMode(triggerPin, OUTPUT);
  pinMode(echoPin, INPUT);

  Serial.println("LoRa Water Level Sender");

  // Устанавливаем пины LoRa
  LoRa.setPins(loraCsPin, loraResetPin, loraIrqPin);
}

void loop() {
  unsigned long now = millis();

  // -------------------- Попытка инициализации LoRa каждые 5 секунд --------------------
  if (!loraInitialized && now - lastTryMillis >= retryInterval) {
    lastTryMillis = now;

    Serial.println("Trying to initialize LoRa...");
    if (LoRa.begin(loraFrequency)) {
      Serial.println("LoRa init OK!");
      loraInitialized = true;
    } else {
      Serial.println("LoRa init failed. Will retry in 5 seconds...");
    }
  }

  // -------------------- Измерение и отправка --------------------
  if (loraInitialized && now - lastMeasurementMillis >= measurementInterval) {
    float averageWaterLevel = measureAverageDistance();
    Serial.print("Average water level = ");
    Serial.println(averageWaterLevel);

    // Отправка через LoRa
    LoRa.beginPacket();
    LoRa.print(averageWaterLevel);
    LoRa.print("*" + SENSOR_ID);
    LoRa.endPacket();

    lastMeasurementMillis = now;
  }
}

// -------------------- Функция измерения ультразвуком --------------------
float measureDistance(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);

  float durationMicroseconds = pulseIn(echo, HIGH);
  float distanceCm = durationMicroseconds / 58.0;
  return distanceCm;
}

// -------------------- Медианный фильтр для стабильных измерений --------------------
float measureAverageDistance() {
  float measurements[numMeasurements];

  for (int i = 0; i < numMeasurements; i++) {
    measurements[i] = measureDistance(triggerPin, echoPin);
    Serial.print("Measurement ");
    Serial.print(i);
    Serial.print(": ");
    Serial.println(measurements[i]);
    delay(500);
  }

  // Применяем медианный фильтр
  return medianFilter(measurements, numMeasurements);
}

float medianFilter(float data[], int size) {
  float sorted[10];
  for (int i = 0; i < size; i++) sorted[i] = data[i];

  for (int i = 0; i < size - 1; i++) {
    for (int j = 0; j < size - i - 1; j++) {
      if (sorted[j] > sorted[j + 1]) {
        float temp = sorted[j];
        sorted[j] = sorted[j + 1];
        sorted[j + 1] = temp;
      }
    }
  }

  float sum = 0;
  for (int i = 2; i < size - 2; i++) sum += sorted[i];

  return sum / (size - 4);
}