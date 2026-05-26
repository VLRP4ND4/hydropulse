#include <SPI.h>
#include <LoRa.h>

const int lora_cs_pin = 10;
const int lora_reset_pin = 9;
const int lora_irq_pin = 2;

const long lora_frequency = 433E6;

void setup() {
  Serial.begin(9600);
  delay(1000);

  Serial.println("LoRa Receiver Test");

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
  Serial.println("Waiting for packets...");
}

void loop() {
  int packet_size = LoRa.parsePacket();

  if (packet_size == 0) {
    return;
  }

  Serial.print("Packet size: ");
  Serial.println(packet_size);

  String message = "";

  while (LoRa.available()) {
    message += (char)LoRa.read();
  }

  Serial.print("Received: ");
  Serial.println(message);

  Serial.print("RSSI: ");
  Serial.println(LoRa.packetRssi());

  Serial.print("SNR: ");
  Serial.println(LoRa.packetSnr());

  Serial.println("--------------------");
}