# ESP32 Serial WiFi Bridge for HydroPulse

This sketch matches the current HydroPulse radio chain:

```text
Arduino Nano + HC-SR04 + LoRa sender
  -> LoRa relay nodes
  -> final LoRa base station
  -> Serial TX
  -> ESP32
  -> Wi-Fi
  -> HydroPulse API
```

The ESP32 does not receive LoRa itself in this variant. It reads the final base station serial output and sends only lines that start with:

```text
DATA;
```

Expected base station line:

```text
DATA;sensor_id;packet_id;distance_cm;hop_count;rssi;snr
```

Example:

```text
DATA;002;17;71.04;2;-81;9.25
```

## Wiring

If the base station is Arduino Nano/Uno at 5V:

```text
Base station GND -> ESP32 GND
Base station TX  -> voltage divider -> ESP32 GPIO16
```

ESP32 GPIO is 3.3V only. Do not connect a 5V Arduino TX directly to ESP32 RX.

Simple voltage divider:

```text
Arduino TX -> 1 kOhm -> ESP32 GPIO16
                    |
                  2 kOhm
                    |
                   GND
```

ESP32 TX is not required because the bridge only receives data from the base station.

Default ESP32 serial pins:

```text
Base station TX -> ESP32 GPIO16
Base station RX <- ESP32 GPIO17, optional and usually not needed
GND             -> GND
```

## What to edit

Open `ESP32_SERIAL_WIFI_BRIDGE.ino` and set:

```cpp
const char WIFI_SSID[] = "YOUR_WIFI_NAME";
const char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";
const char API_URL[] = "https://YOUR_HYDROPULSE_DOMAIN/api/measurements";
```

Use the public HydroPulse application domain in `API_URL`.

Do not use the PostgreSQL domain:

```text
hydropulse-tommivaerti.db-msk0.amvera.tech
```

## Base station requirements

The existing `BASE_STATION.ino` already prints the correct line:

```text
DATA;sensor_id;packet_id;distance_cm;hop_count;rssi;snr
```

It uses:

```cpp
Serial.begin(9600);
```

So the ESP32 bridge also listens at `9600`.

## Arduino IDE setup

1. Install ESP32 board support in Arduino IDE.
2. Select `ESP32 Dev Module`.
3. Open `ESP32_SERIAL_WIFI_BRIDGE.ino`.
4. Fill Wi-Fi credentials and `API_URL`.
5. Upload to ESP32.
6. Open Serial Monitor at `115200`.

## Expected Serial Monitor output

```text
WiFi connected. IP: ...
Waiting for DATA lines from base station...
Base station: DATA;002;17;71.04;2;-81;9.25
POST https://.../api/measurements
HTTP code: 201
Response: {...}
```

If you see base station text but no HTTP request, the received line probably does not start with `DATA;`.

If you see:

```text
HTTP code: 400
Response: {"error":"sensor_not_found"}
```

The `sensor_id` from the packet does not exist in HydroPulse or is inactive.
