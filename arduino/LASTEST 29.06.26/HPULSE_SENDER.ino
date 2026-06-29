#include <SPI.h>
#include <LoRa.h>
#include <LowPower.h>
#include <EEPROM.h>

// ================================================================
//  Yanini Sender / Measuring Node
//  Arduino Nano + XL1278/SX1278 + HC-SR04
//
//  Логика сети:
//  - формат пакета: sensorId;packetId;distanceCm;hop
//  - sender отправляет один и тот же packetId 2 раза для надежности
//  - hop у sender всегда 0
//  - packetId хранится в EEPROM с резервным шагом, чтобы после перезапуска
//    не повторять старые номера пакетов
//
//  ВАЖНО: мощность sender НЕ изменена.
// ================================================================

// -------------------- Ультразвуковой датчик --------------------
const int triggerPin = 3;
const int echoPin = 4;
const int powerPin = 5; // Пин управления питанием датчика HC-SR04

// Уникальный ID этого датчика. Для других датчиков ставьте "002", "003", ...
const char SENSOR_ID[] = "001";

// -------------------- Packet ID + EEPROM --------------------
// В EEPROM хранится не последний отправленный ID, а начало следующего
// зарезервированного блока. После перезагрузки sender перескакивает вперед
// и не повторяет старые packetId.
unsigned long packetId = 0;
unsigned long packetIdReserveEnd = 0;
const int EEPROM_PACKET_ID_ADDRESS = 0;
const unsigned long EEPROM_EMPTY_VALUE = 0xFFFFFFFFUL;
const unsigned long PACKET_ID_RESERVE_STEP = 10UL; // сколько ID резервируем одной записью EEPROM

// -------------------- Настройки радиомодуля LoRa --------------------
const int loraCsPin = 10;    // NSS / CS
const int loraResetPin = 9;  // RST
const int loraIrqPin = 2;    // DIO0

const long loraFrequency = 434500000L;

const byte LORA_SPREADING_FACTOR = 12;
const long LORA_BANDWIDTH = 62.5E3;
const byte LORA_CODING_RATE = 8;
const byte LORA_SYNC_WORD = 0x12;

// Мощность sender оставлена как была.
const byte SENDER_TX_POWER_DBM = 10;
const byte SENDER_OCP_MA = 100;

// -------------------- Настройки сна --------------------
// Для теста: 2 = около 16 секунд. Для часа: 450.
const int sleepCyclesMax = 2;

// -------------------- Измерение --------------------
const int numMeasurements = 10;
const byte DISTANCE_TEXT_SIZE = 12;
const byte MESSAGE_BUFFER_SIZE = 48;
const byte SEND_REPEATS = 2;
const unsigned long REPEAT_DELAY_MS = 700UL;

void setup() {
  Serial.begin(9600);
  delay(1000);

  pinMode(triggerPin, OUTPUT);
  digitalWrite(triggerPin, LOW);
  pinMode(echoPin, INPUT);

  // Изначально изолируем питание HC-SR04.
  pinMode(powerPin, INPUT);

  pinMode(loraResetPin, OUTPUT);
  pinMode(loraCsPin, OUTPUT);
  digitalWrite(loraResetPin, HIGH);
  digitalWrite(loraCsPin, HIGH);

  loadPacketIdFromEeprom();

  Serial.println(F("Yanini Sender - Network Logic Mode"));
  Serial.print(F("Starting packetId: "));
  Serial.println(packetId);

  LoRa.setPins(loraCsPin, loraResetPin, loraIrqPin);

  if (LoRa.begin(loraFrequency)) {
    configureLoRa();
    Serial.println(F("LoRa init OK"));
  } else {
    Serial.println(F("LoRa init FAILED"));
  }
}

void loop() {
  Serial.begin(9600);
  Serial.println(F("\n--- Wake up: measurement cycle ---"));

  float distanceCm = measureWaterDistanceCm();

  Serial.print(F("Distance cm: "));
  Serial.println(distanceCm);

  // Готовим LoRa к передаче.
  digitalWrite(loraCsPin, HIGH);
  LoRa.idle();
  delay(20);

  bool anySendOk = false;

  if (distanceCm >= 0) {
    char distanceText[DISTANCE_TEXT_SIZE];
    char message[MESSAGE_BUFFER_SIZE];

    dtostrf(distanceCm, 0, 2, distanceText);

    int written = snprintf(
      message,
      sizeof(message),
      "%s;%lu;%s;0",
      SENSOR_ID,
      packetId,
      distanceText
    );

    if (written < 0 || written >= (int)sizeof(message)) {
      Serial.println(F("Message buffer overflow. Packet not sent."));
    } else {
      for (byte attempt = 1; attempt <= SEND_REPEATS; attempt++) {
        Serial.print(F("Sending attempt "));
        Serial.print(attempt);
        Serial.print(F("/"));
        Serial.print(SEND_REPEATS);
        Serial.print(F(": "));
        Serial.println(message);

        LoRa.idle();
        LoRa.beginPacket();
        LoRa.print(message);
        int sendResult = LoRa.endPacket();

        if (sendResult == 1) {
          anySendOk = true;
          Serial.println(F("Send OK"));
        } else {
          Serial.println(F("Send FAILED"));
        }

        if (attempt < SEND_REPEATS) {
          delay(REPEAT_DELAY_MS);
        }
      }
    }
  } else {
    Serial.println(F("Invalid distance. Packet not sent."));
  }

  if (anySendOk) {
    packetId++;
    reservePacketIdsIfNeeded();
  }

  goToDeepSleep();
}

void configureLoRa() {
  LoRa.setSpreadingFactor(LORA_SPREADING_FACTOR);
  LoRa.setSignalBandwidth(LORA_BANDWIDTH);
  LoRa.setCodingRate4(LORA_CODING_RATE);
  LoRa.setSyncWord(LORA_SYNC_WORD);
  LoRa.enableCrc();

  // НЕ МЕНЯТЬ: мощность sender оставлена как в твоем варианте.
  LoRa.setTxPower(SENDER_TX_POWER_DBM);
  LoRa.setOCP(SENDER_OCP_MA);
}

void loadPacketIdFromEeprom() {
  unsigned long storedReserveEnd = EEPROM_EMPTY_VALUE;
  EEPROM.get(EEPROM_PACKET_ID_ADDRESS, storedReserveEnd);

  if (storedReserveEnd == EEPROM_EMPTY_VALUE || storedReserveEnd > 4000000000UL) {
    packetId = 0;
  } else {
    // Начинаем с ранее зарезервированной границы. Это намеренно пропускает
    // несколько номеров, зато не создает дублей после внезапного сброса.
    packetId = storedReserveEnd;
  }

  reserveNextPacketIdBlock();
}

void reserveNextPacketIdBlock() {
  if (packetId > 4000000000UL - PACKET_ID_RESERVE_STEP) {
    packetId = 0;
  }

  packetIdReserveEnd = packetId + PACKET_ID_RESERVE_STEP;
  EEPROM.put(EEPROM_PACKET_ID_ADDRESS, packetIdReserveEnd);

  Serial.print(F("EEPROM reserved packet IDs up to: "));
  Serial.println(packetIdReserveEnd);
}

void reservePacketIdsIfNeeded() {
  if (packetId >= packetIdReserveEnd) {
    reserveNextPacketIdBlock();
  }
}

float measureWaterDistanceCm() {
  pinMode(powerPin, OUTPUT);
  digitalWrite(powerPin, HIGH);

  pinMode(echoPin, INPUT);
  pinMode(triggerPin, OUTPUT);
  digitalWrite(triggerPin, LOW);

  delay(600); // время на питание HC-SR04 и заряд конденсатора

  float distanceCm = measureAverageDistance();

  // Изоляция датчика перед сном.
  digitalWrite(triggerPin, LOW);
  digitalWrite(powerPin, LOW);
  pinMode(powerPin, INPUT);

  return distanceCm;
}

float measureDistance(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);

  unsigned long durationMicroseconds = pulseIn(echo, HIGH, 150000UL);
  if (durationMicroseconds == 0) {
    return -1.0;
  }

  return durationMicroseconds / 58.0;
}

float measureAverageDistance() {
  float measurements[numMeasurements];

  for (int i = 0; i < numMeasurements; i++) {
    measurements[i] = measureDistance(triggerPin, echoPin);
    delay(200);
  }

  return filteredAverage(measurements, numMeasurements);
}

float filteredAverage(float data[], int size) {
  float valid[10];
  int validCount = 0;

  for (int i = 0; i < size && i < 10; i++) {
    if (data[i] >= 0) {
      valid[validCount] = data[i];
      validCount++;
    }
  }

  if (validCount == 0) {
    return -1.0;
  }

  for (int i = 0; i < validCount - 1; i++) {
    for (int j = 0; j < validCount - i - 1; j++) {
      if (valid[j] > valid[j + 1]) {
        float temp = valid[j];
        valid[j] = valid[j + 1];
        valid[j + 1] = temp;
      }
    }
  }

  // Если данных мало, берем медиану.
  if (validCount < 5) {
    return valid[validCount / 2];
  }

  // Отбрасываем 2 самых маленьких и 2 самых больших значения.
  float sum = 0;
  int count = 0;
  for (int i = 2; i < validCount - 2; i++) {
    sum += valid[i];
    count++;
  }

  if (count <= 0) {
    return valid[validCount / 2];
  }

  return sum / count;
}

void goToDeepSleep() {
  Serial.println(F("Going to deep sleep..."));
  Serial.flush();
  Serial.end();

  LoRa.sleep();
  digitalWrite(loraCsPin, HIGH);

  for (int i = 0; i < sleepCyclesMax; i++) {
    LowPower.powerDown(SLEEP_8S, ADC_OFF, BOD_OFF);
  }
}
