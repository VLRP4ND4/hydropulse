#include <SPI.h>
#include <LoRa.h>

// -------------------- LoRa --------------------
const int loraCsPin = 10;    // NSS / CS
const int loraResetPin = 9;  // RST
const int loraIrqPin = 2;    // DIO0

const long loraFrequency = 433E6;

// -------------------- Повторная инициализация LoRa --------------------
const unsigned long retryInterval = 5000; // 5 секунд
unsigned long lastTryMillis = 0;
bool loraInitialized = false;

// -------------------- Защита от дубликатов --------------------
String lastPacketKey = "";

void setup() {
  Serial.begin(9600);
  delay(1000);

  Serial.println("LoRa Base Station");

  LoRa.setPins(loraCsPin, loraResetPin, loraIrqPin);
}

void loop() {
  unsigned long currentMillis = millis();

  // Если LoRa ещё не инициализирована, пробуем каждые 5 секунд
  if (!loraInitialized && currentMillis - lastTryMillis >= retryInterval) {
    lastTryMillis = currentMillis;

    Serial.println("Trying to initialize LoRa...");

    if (LoRa.begin(loraFrequency)) {
      configureLoRa();
      loraInitialized = true;

      Serial.println("LoRa init OK!");
      Serial.println("Waiting for packets...");
    } else {
      Serial.println("LoRa init failed. Will retry in 5 seconds...");
    }
  }

  if (!loraInitialized) {
    return;
  }

  // Проверяем, пришёл ли пакет
  int packetSize = LoRa.parsePacket();

  if (packetSize == 0) {
    return;
  }

  String message = "";

  while (LoRa.available()) {
    message += (char)LoRa.read();
  }

  Serial.print("Raw packet: ");
  Serial.println(message);

  String sensorId;
  String packetId;
  String distanceText;
  String hopText;

  if (!parsePacket(message, sensorId, packetId, distanceText, hopText)) {
    Serial.println("Invalid packet format");
    Serial.println("--------------------");
    return;
  }

  String packetKey = sensorId + ";" + packetId;

  if (packetKey == lastPacketKey) {
    Serial.println("Duplicate packet skipped");
    Serial.println("--------------------");
    return;
  }

  lastPacketKey = packetKey;

  int rssi = LoRa.packetRssi();
  float snr = LoRa.packetSnr();

  // -------------------- Человекочитаемый вывод --------------------
  Serial.print("Sensor ID: ");
  Serial.println(sensorId);

  Serial.print("Packet ID: ");
  Serial.println(packetId);

  Serial.print("Distance cm: ");
  Serial.println(distanceText);

  Serial.print("Hop count: ");
  Serial.println(hopText);

  Serial.print("RSSI: ");
  Serial.println(rssi);

  Serial.print("SNR: ");
  Serial.println(snr);

  // -------------------- Строка для Node.js / PostgreSQL --------------------
  // Формат:
  // DATA;sensor_id;packet_id;distance_cm;hop_count;rssi;snr
  //
  // Пример:
  // DATA;001;7;71.04;1;-81;9.25

  Serial.print("DATA;");
  Serial.print(sensorId);
  Serial.print(";");
  Serial.print(packetId);
  Serial.print(";");
  Serial.print(distanceText);
  Serial.print(";");
  Serial.print(hopText);
  Serial.print(";");
  Serial.print(rssi);
  Serial.print(";");
  Serial.println(snr);

  Serial.println("--------------------");
}

void configureLoRa() {
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setSyncWord(0x12);
  LoRa.enableCrc();

  // Для теста лучше не ставить максимальную мощность
  LoRa.setTxPower(10);
}

bool parsePacket(
  String message,
  String &sensorId,
  String &packetId,
  String &distanceText,
  String &hopText
) {
  int p1 = message.indexOf(';');
  int p2 = message.indexOf(';', p1 + 1);
  int p3 = message.indexOf(';', p2 + 1);

  if (p1 == -1 || p2 == -1 || p3 == -1) {
    return false;
  }

  sensorId = message.substring(0, p1);
  packetId = message.substring(p1 + 1, p2);
  distanceText = message.substring(p2 + 1, p3);
  hopText = message.substring(p3 + 1);

  return true;
}