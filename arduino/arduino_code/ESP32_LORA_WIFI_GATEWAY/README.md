# ESP32 LoRa WiFi Gateway for HydroPulse

This sketch is for the real HydroPulse hardware chain:

```text
Arduino Nano + HC-SR04 -> LoRa -> ESP32 + LoRa -> Wi-Fi -> HydroPulse API
```

The Arduino Nano sender can keep using the existing packet format:

```text
sensor_id;packet_id;distance_cm;hop_count
```

Example:

```text
002;17;71.04;0
```

The ESP32 receives that LoRa packet, adds `rssi` and `snr`, then sends JSON to:

```text
POST /api/measurements
```

## What to edit

Open `ESP32_LORA_WIFI_GATEWAY.ino` and set:

```cpp
const char WIFI_SSID[] = "YOUR_WIFI_NAME";
const char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";
const char API_URL[] = "https://YOUR_HYDROPULSE_DOMAIN/api/measurements";
```

Use the public HydroPulse application domain in `API_URL`.

Do not use:

```text
hydropulse-tommivaerti.db-msk0.amvera.tech
amvera-...-cnpg-...-rw
amvera-...-run-...
```

Those are database or internal service domains, not the public app API URL.

## Default ESP32 LoRa pins

```text
LoRa SCK  -> GPIO18
LoRa MISO -> GPIO19
LoRa MOSI -> GPIO23
LoRa NSS  -> GPIO5
LoRa RST  -> GPIO14
LoRa DIO0 -> GPIO2
3.3V      -> 3.3V
GND       -> GND
```

Change the pin constants if your wiring is different.

Important: SX127x LoRa modules must be powered from 3.3V logic. Do not connect them to 5V logic.

## LoRa settings

The gateway uses the same settings as the existing Nano/base-station sketches:

```text
Frequency: 433 MHz
Spreading factor: 7
Bandwidth: 125 kHz
Coding rate: 4/5
Sync word: 0x12
CRC: enabled
```

## Arduino IDE setup

1. Install ESP32 board support in Arduino IDE.
2. Install the `LoRa` library by Sandeep Mistry.
3. Select an ESP32 board, for example `ESP32 Dev Module`.
4. Open `ESP32_LORA_WIFI_GATEWAY.ino`.
5. Fill Wi-Fi credentials and `API_URL`.
6. Upload the sketch.
7. Open Serial Monitor at `115200`.

## Expected Serial Monitor output

Successful flow:

```text
WiFi connected. IP: ...
LoRa init OK. Waiting for packets...
Raw LoRa packet: 002;17;71.04;0
POST https://.../api/measurements
HTTP code: 201
Response: {...}
```

Common API error:

```text
HTTP code: 400
Response: {"error":"sensor_not_found"}
```

The `sensor_id` from the Nano packet does not exist in the HydroPulse database or is not active.
