#include <SPI.h>
#include <LoRa.h>

// -------------------- Ультразвуковой датчик --------------------
const int triggerPin = 3;
const int echoPin = 4;

// ID этого датчика
const char SENSOR_ID[] = "002";
unsigned long packetId = 0;

// -------------------- LoRa --------------------
const int loraCsPin = 10;    // NSS / CS
const int loraResetPin = 9;  // RST
const int loraIrqPin = 2;    // DIO0

const long loraFrequency = 433E6;

// -------------------- Измерения --------------------
const int numMeasurements = 10;
const unsigned long measurementInterval = 10 * 1000UL; // 10 секунд между циклами
unsigned long lastMeasurementMillis = 0;

// -------------------- Повторная инициализация LoRa --------------------
const unsigned long retryInterval = 5000; // 5 секунд
unsigned long lastTryMillis = 0;
bool loraInitialized = false;

void setup() {
  Serial.begin(9600);
  delay(1000);

  pinMode(triggerPin, OUTPUT);
  pinMode(echoPin, INPUT);

  Serial.println("LoRa Water Level Sender");

  LoRa.setPins(loraCsPin, loraResetPin, loraIrqPin);
}

void loop() {
  unsigned long currentMillis = millis();

  if (!loraInitialized && currentMillis - lastTryMillis >= retryInterval) {
    lastTryMillis = currentMillis;

    Serial.println("Trying to initialize LoRa...");

    if (LoRa.begin(loraFrequency)) {
      configureLoRa();
      loraInitialized = true;
      Serial.println("LoRa init OK!");
    } else {
      Serial.println("LoRa init failed. Will retry in 5 seconds...");
    }
  }

  if (loraInitialized && currentMillis - lastMeasurementMillis >= measurementInterval) {
    lastMeasurementMillis = currentMillis;

    float distanceCm = measureAverageDistance();

    Serial.println("After measurement");
    Serial.print("Distance cm: ");
    Serial.println(distanceCm);

    if (distanceCm < 0) {
      Serial.println("Invalid distance. Packet not sent.");
      Serial.println("--------------------");
      return;
    }

    char distanceText[12];
    char message[40];

    dtostrf(distanceCm, 0, 2, distanceText);

    snprintf(
      message,
      sizeof(message),
      "%s;%lu;%s;0",
      SENSOR_ID,
      packetId,
      distanceText
    );

    Serial.print("Sending packet: ");
    Serial.println(message);

    LoRa.beginPacket();
    LoRa.print(message);
    int sendResult = LoRa.endPacket();

    if (sendResult == 1) {
      Serial.println("Send OK");
      packetId++;
    } else {
      Serial.println("Send failed");
    }

    Serial.println("--------------------");
  }
}

void configureLoRa() {
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setSyncWord(0x12);
  LoRa.enableCrc();
}

float measureDistance(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);

  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);

  unsigned long durationMicroseconds = pulseIn(echo, HIGH, 30000UL);

  if (durationMicroseconds == 0) {
    
    return -1.0;
  }

  float distanceCm = durationMicroseconds / 58.0;
  return distanceCm;
}

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

  return medianFilter(measurements, numMeasurements);
}

float medianFilter(float data[], int size) {
  float sorted[10];

  for (int i = 0; i < size; i++) {
    sorted[i] = data[i];
  }

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

  for (int i = 2; i < size - 2; i++) {
    sum += sorted[i];
  }

  return sum / (size - 4);
}