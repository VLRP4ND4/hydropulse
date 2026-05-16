#include <SPI.h>
#include <LoRa.h>

const int lora_cs_pin = 10;
const int lora_reset_pin = 9;
const int lora_irq_pin = 2;

void setup() {
  Serial.begin(9600);
  delay(1000);

  Serial.println("LoRa module test");

  LoRa.setPins(lora_cs_pin, lora_reset_pin, lora_irq_pin);

  if (!LoRa.begin(433E6)) {
    Serial.println("LoRa init failed");
    while (true);
  }

  Serial.println("LoRa init OK");
}

void loop() {
  Serial.println("Sending packet");

  LoRa.beginPacket();
  LoRa.print("test");
  LoRa.endPacket();

  Serial.println("Packet sent");

  delay(3000);
}