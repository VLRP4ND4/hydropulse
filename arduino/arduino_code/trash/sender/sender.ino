#include <SPI.h>
#include <LoRa.h>

const int lora_cs_pin = 10;
const int lora_reset_pin = 9;
const int lora_irq_pin = 2;

const long lora_frequency = 433E6;

int packet_counter = 0;

void setup() {
  Serial.begin(9600);
  delay(1000);

  Serial.println("LoRa Sender Test");

  LoRa.setPins(lora_cs_pin, lora_reset_pin, lora_irq_pin);

  if (!LoRa.begin(lora_frequency)) {
    Serial.println("LoRa init failed");
    while (true);
  }

  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setSyncWord(0x12);
  LoRa.enableCrc();

  Serial.println("LoRa init OK");
}

void loop() {
  String message = "test_packet_" + String(packet_counter);

  Serial.print("Sending: ");
  Serial.println(message);

  LoRa.beginPacket();
  LoRa.print(message);
  int result = LoRa.endPacket();

  if (result == 1) {
    Serial.println("Send OK");
  } else {
    Serial.println("Send failed");
  }

  packet_counter++;
  delay(3000);
}