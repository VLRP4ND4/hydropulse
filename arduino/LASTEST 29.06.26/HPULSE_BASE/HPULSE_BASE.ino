#include <SPI.h>
#include <LoRa.h>

// ================================================================
//  Yanini Base Station
//  Arduino Nano + XL1278/SX1278 connected to PC/Node.js
//
//  Логика сети:
//  - постоянный прием, без сна
//  - формат пакета: sensorId;packetId;distanceCm;hop
//  - кэш последних пакетов, а не только один lastPacketId
//  - вывод RSSI/SNR и DATA-строки для Node.js/PostgreSQL
// ================================================================

// -------------------- Пины LoRa --------------------
const int loraCsPin = 10;
const int loraResetPin = 9;
const int loraIrqPin = 2;

// -------------------- Радиоконфигурация Yanini --------------------
const long loraFrequency = 434500000L;

const byte LORA_SPREADING_FACTOR = 12;
const long LORA_BANDWIDTH = 62.5E3;
const byte LORA_CODING_RATE = 8;
const byte LORA_SYNC_WORD = 0x12;

// База обычно не передает, но оставляем безопасную настройку на случай служебных тестов.
const byte BASE_TX_POWER_DBM = 18;
const byte BASE_OCP_MA = 240;

// -------------------- Повторная инициализация LoRa --------------------
const unsigned long retryInterval = 5000UL;
unsigned long lastTryMillis = 0;
bool firstLoRaInitTry = true;
bool loraInitialized = false;

// -------------------- Формат пакета --------------------
const byte INCOMING_BUFFER_SIZE = 64;
const byte SENSOR_ID_SIZE = 8;
const byte PACKET_ID_SIZE = 12;
const byte DISTANCE_SIZE = 12;
const byte HOP_SIZE = 6;

char incomingBuffer[INCOMING_BUFFER_SIZE];

// -------------------- Кэш дублей --------------------
const byte DUP_CACHE_SIZE = 24;
char seenSensorIds[DUP_CACHE_SIZE][SENSOR_ID_SIZE];
unsigned long seenPacketIds[DUP_CACHE_SIZE];
byte seenWriteIndex = 0;

void setup() {
  Serial.begin(9600);
  delay(1000);

  Serial.println(F("Yanini Base Station - Network Logic Mode"));

  pinMode(loraCsPin, OUTPUT);
  pinMode(loraResetPin, OUTPUT);
  digitalWrite(loraCsPin, HIGH);
  digitalWrite(loraResetPin, HIGH);

  clearDuplicateCache();

  LoRa.setPins(loraCsPin, loraResetPin, loraIrqPin);
}

void loop() {
  initializeLoRaIfNeeded();

  if (!loraInitialized) {
    return;
  }

  int packetSize = LoRa.parsePacket();

  if (packetSize == 0) {
    return;
  }

  int rssi = LoRa.packetRssi();
  float snr = LoRa.packetSnr();

  if (!readPacketToBuffer(packetSize)) {
    Serial.println(F("Packet too large. Dropped."));
    Serial.println(F("--------------------"));
    LoRa.receive();
    return;
  }

  Serial.print(F("Raw packet received: "));
  Serial.println(incomingBuffer);

  char sensorId[SENSOR_ID_SIZE] = "";
  char packetIdText[PACKET_ID_SIZE] = "";
  char distanceText[DISTANCE_SIZE] = "";
  char hopText[HOP_SIZE] = "";

  if (!parsePacketFixed(incomingBuffer, sensorId, packetIdText, distanceText, hopText)) {
    Serial.println(F("Invalid packet format"));
    Serial.println(F("--------------------"));
    LoRa.receive();
    return;
  }

  if (!isUnsignedNumber(packetIdText) || !isUnsignedNumber(hopText)) {
    Serial.println(F("Invalid packetId or hop"));
    Serial.println(F("--------------------"));
    LoRa.receive();
    return;
  }

  unsigned long currentPacketId = strtoul(packetIdText, NULL, 10);

  if (wasPacketSeen(sensorId, currentPacketId)) {
    Serial.println(F("Duplicate packet skipped"));
    Serial.println(F("--------------------"));
    LoRa.receive();
    return;
  }

  rememberPacket(sensorId, currentPacketId);

  printHumanReadableData(sensorId, packetIdText, distanceText, hopText, rssi, snr);
  printDataLine(sensorId, packetIdText, distanceText, hopText, rssi, snr);

  Serial.flush();
  Serial.println(F("--------------------"));

  LoRa.receive();
}

void initializeLoRaIfNeeded() {
  unsigned long currentMillis = millis();

  if (loraInitialized) {
    return;
  }

  if (!firstLoRaInitTry && currentMillis - lastTryMillis < retryInterval) {
    return;
  }

  firstLoRaInitTry = false;
  lastTryMillis = currentMillis;

  Serial.println(F("Trying to initialize LoRa..."));

  if (LoRa.begin(loraFrequency)) {
    configureLoRa();
    LoRa.receive();
    loraInitialized = true;

    Serial.println(F("LoRa init OK"));
    Serial.println(F("Waiting for packets..."));
  } else {
    Serial.println(F("LoRa init failed. Will retry."));
  }
}

void configureLoRa() {
  LoRa.setSpreadingFactor(LORA_SPREADING_FACTOR);
  LoRa.setSignalBandwidth(LORA_BANDWIDTH);
  LoRa.setCodingRate4(LORA_CODING_RATE);
  LoRa.setSyncWord(LORA_SYNC_WORD);
  LoRa.enableCrc();

  LoRa.setTxPower(BASE_TX_POWER_DBM);
  LoRa.setOCP(BASE_OCP_MA);
}

bool readPacketToBuffer(int packetSize) {
  if (packetSize >= INCOMING_BUFFER_SIZE) {
    while (LoRa.available()) {
      LoRa.read();
    }
    incomingBuffer[0] = '\0';
    return false;
  }

  int i = 0;
  while (LoRa.available() && i < INCOMING_BUFFER_SIZE - 1) {
    incomingBuffer[i] = (char)LoRa.read();
    i++;
  }
  incomingBuffer[i] = '\0';

  return true;
}

bool parsePacketFixed(
  char* msg,
  char* sensorId,
  char* packetId,
  char* distanceText,
  char* hopText
) {
  char* p1 = strchr(msg, ';');
  if (p1 == NULL) return false;

  char* p2 = strchr(p1 + 1, ';');
  if (p2 == NULL) return false;

  char* p3 = strchr(p2 + 1, ';');
  if (p3 == NULL) return false;

  // Сохраняем совместимость со старым форматом: только 4 поля.
  if (strchr(p3 + 1, ';') != NULL) return false;

  int lenId = p1 - msg;
  int lenPack = p2 - (p1 + 1);
  int lenDist = p3 - (p2 + 1);
  int lenHop = strlen(p3 + 1);

  if (lenId <= 0 || lenPack <= 0 || lenDist <= 0 || lenHop <= 0) {
    return false;
  }

  copyField(sensorId, SENSOR_ID_SIZE, msg, lenId);
  copyField(packetId, PACKET_ID_SIZE, p1 + 1, lenPack);
  copyField(distanceText, DISTANCE_SIZE, p2 + 1, lenDist);
  copyField(hopText, HOP_SIZE, p3 + 1, lenHop);

  return true;
}

void copyField(char* dst, byte dstSize, const char* src, int srcLen) {
  if (dstSize == 0) return;

  int copyLen = srcLen;
  if (copyLen > dstSize - 1) {
    copyLen = dstSize - 1;
  }

  strncpy(dst, src, copyLen);
  dst[copyLen] = '\0';
}

bool isUnsignedNumber(const char* text) {
  if (text == NULL || text[0] == '\0') {
    return false;
  }

  for (byte i = 0; text[i] != '\0'; i++) {
    if (text[i] < '0' || text[i] > '9') {
      return false;
    }
  }

  return true;
}

void clearDuplicateCache() {
  for (byte i = 0; i < DUP_CACHE_SIZE; i++) {
    seenSensorIds[i][0] = '\0';
    seenPacketIds[i] = 0xFFFFFFFFUL;
  }
  seenWriteIndex = 0;
}

bool wasPacketSeen(const char* sensorId, unsigned long packetId) {
  for (byte i = 0; i < DUP_CACHE_SIZE; i++) {
    if (seenPacketIds[i] == packetId && strcmp(seenSensorIds[i], sensorId) == 0) {
      return true;
    }
  }

  return false;
}

void rememberPacket(const char* sensorId, unsigned long packetId) {
  strncpy(seenSensorIds[seenWriteIndex], sensorId, SENSOR_ID_SIZE - 1);
  seenSensorIds[seenWriteIndex][SENSOR_ID_SIZE - 1] = '\0';
  seenPacketIds[seenWriteIndex] = packetId;

  seenWriteIndex++;
  if (seenWriteIndex >= DUP_CACHE_SIZE) {
    seenWriteIndex = 0;
  }
}

void printHumanReadableData(
  const char* sensorId,
  const char* packetIdText,
  const char* distanceText,
  const char* hopText,
  int rssi,
  float snr
) {
  Serial.print(F("Sensor ID: "));
  Serial.println(sensorId);

  Serial.print(F("Packet ID: "));
  Serial.println(packetIdText);

  Serial.print(F("Distance cm: "));
  Serial.println(distanceText);

  Serial.print(F("Hop count: "));
  Serial.println(hopText);

  Serial.print(F("RSSI: "));
  Serial.println(rssi);

  Serial.print(F("SNR: "));
  Serial.println(snr);
}

void printDataLine(
  const char* sensorId,
  const char* packetIdText,
  const char* distanceText,
  const char* hopText,
  int rssi,
  float snr
) {
  // Формат для Node.js/PostgreSQL:
  // DATA;sensor_id;packet_id;distance_cm;hop_count;rssi;snr
  Serial.print(F("DATA;"));
  Serial.print(sensorId);
  Serial.print(F(";"));
  Serial.print(packetIdText);
  Serial.print(F(";"));
  Serial.print(distanceText);
  Serial.print(F(";"));
  Serial.print(hopText);
  Serial.print(F(";"));
  Serial.print(rssi);
  Serial.print(F(";"));
  Serial.println(snr);
}
