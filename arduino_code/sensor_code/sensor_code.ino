#include <SPI.h>
#include <LoRa.h>

// -------------------- Настройки пинов ультразвукового датчика --------------------
const int triggerPin = 3;  // триггер датчика
const int echoPin = 4;     // эхо-выход датчика

// -------------------- Настройки LoRa --------------------
const String SENSOR_ID = "001";  // идентификатор датчика для LoRa

// -------------------- Настройки измерений --------------------
unsigned long lastMeasurementMillis = 0;                 // время последнего замера
const unsigned long measurementInterval = 30 * 1000UL;  // интервал замера 30 секунд
const int numMeasurements = 10;                         // количество повторных измерений для медианы

// -------------------- Функции --------------------

// Функция setup: выполняется один раз при старте
void setup() {
  Serial.begin(9600);
  pinMode(triggerPin, OUTPUT);
  pinMode(echoPin, INPUT);

  Serial.println("LoRa Water Level Sender");

  // Инициализация LoRa на частоте 433 MHz
  if (!LoRa.begin(433E6)) {
    Serial.println("Starting LoRa failed!");
    while (1); // остановка программы при ошибке
  }
}

// Функция loop: выполняется постоянно
void loop() {
  unsigned long currentMillis = millis();

  // Проверяем, пора ли делать новое измерение
  if (currentMillis - lastMeasurementMillis >= measurementInterval) {
    // Получаем среднее значение воды с медианным фильтром
    float averageWaterLevel = measureAverageDistance();

    // Вывод в Serial для отладки
    Serial.print("Average water level = ");
    Serial.println(averageWaterLevel);

    // Отправка через LoRa
    LoRa.beginPacket();
    LoRa.print(averageWaterLevel);
    LoRa.print("*" + SENSOR_ID);
    LoRa.endPacket();

    // Обновляем время последнего измерения
    lastMeasurementMillis = currentMillis;
  }
}

// -------------------- Фильтр медианы --------------------
// Функция сортирует массив измерений и усредняет средние значения,
// отбрасывая крайние (самые маленькие и самые большие) для удаления выбросов
float medianFilter(float data[], int size) {
  float sorted[10];

  // Копируем массив, чтобы не менять исходные измерения
  for (int i = 0; i < size; i++) {
    sorted[i] = data[i];
  }

  // Простая сортировка пузырьком
  for (int i = 0; i < size - 1; i++) {
    for (int j = 0; j < size - i - 1; j++) {
      if (sorted[j] > sorted[j + 1]) {
        float temp = sorted[j];
        sorted[j] = sorted[j + 1];
        sorted[j + 1] = temp;
      }
    }
  }

  // Усредняем средние значения, отбрасывая два крайних с каждой стороны
  float sum = 0;
  for (int i = 2; i < size - 2; i++) {
    sum += sorted[i];
  }

  return sum / (size - 4); // возвращаем медианное среднее
}

// -------------------- Среднее измерение --------------------
// Функция делает numMeasurements измерений, сохраняет в массив и применяет медианный фильтр
float measureAverageDistance() {
  float measurements[numMeasurements];

  // Сбор измерений
  for (int i = 0; i < numMeasurements; i++) {
    measurements[i] = measureDistance(triggerPin, echoPin);

    // Вывод каждого измерения для отладки
    Serial.print("Measurement ");
    Serial.print(i);
    Serial.print(": ");
    Serial.println(measurements[i]);

    delay(500); // небольшая пауза между измерениями
  }

  // Применяем медианный фильтр
  float averageWaterLevel = medianFilter(measurements, numMeasurements);

  return averageWaterLevel;
}

// -------------------- Одно измерение --------------------
// Функция делает одно измерение расстояния ультразвуком
float measureDistance(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);

  float durationMicroseconds = pulseIn(echo, HIGH);
  float distanceCm = durationMicroseconds / 58.0; // конвертация времени в см

  return distanceCm;
}