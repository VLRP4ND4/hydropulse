#include <SPI.h>
#include <LoRa.h>

// Пины LoRa для Nano
const int loraCsPin = 10;    // CS/NSS
const int loraResetPin = 9;  // RST
const int loraIrqPin = 2;    // DIO0

const long loraFrequency = 433E6;  // Частота модуля
unsigned long lastTryMillis = 0;
const unsigned long retryInterval = 5000; // 5 секунд

bool loraInitialized = false;

void setup() {
  Serial.begin(9600);
  delay(1000);

  Serial.println("LoRa Receiver Station");

  LoRa.setPins(loraCsPin, loraResetPin, loraIrqPin);
}

void loop() {
  unsigned long now = millis();

  // Если LoRa не инициализирована, пробуем каждые 5 секунд
  if (!loraInitialized && now - lastTryMillis >= retryInterval) {
    lastTryMillis = now;

    Serial.println("Trying to initialize LoRa...");
    if (LoRa.begin(loraFrequency)) {
      Serial.println("LoRa init OK!");
      loraInitialized = true;
      Serial.println("Waiting for packets...");
    } else {
      Serial.println("LoRa init failed. Will retry in 5 seconds...");
    }
  }

  // Если LoRa инициализирована, принимаем пакеты
  if (loraInitialized) {
    int packetSize = LoRa.parsePacket();
    if (packetSize) {
      String message = "";
      while (LoRa.available()) {
        message += (char)LoRa.read();
      }
      Serial.print("Received: ");
      Serial.println(message);
    }
  }
}