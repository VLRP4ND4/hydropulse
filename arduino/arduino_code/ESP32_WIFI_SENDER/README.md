# ESP32 WiFi Sender for HydroPulse

This sketch sends ultrasonic water-level measurements directly to the HydroPulse API over Wi-Fi.

## What to edit

Open `ESP32_WIFI_SENDER.ino` and set:

```cpp
const char WIFI_SSID[] = "YOUR_WIFI_NAME";
const char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";
const char API_URL[] = "https://YOUR_HYDROPULSE_DOMAIN/api/measurements";
const char SENSOR_ID[] = "002";
```

`SENSOR_ID` must already exist in the HydroPulse database table `sensors`.

Use a public HydroPulse app domain in `API_URL`, not the internal Amvera domain.

## Default pins

```text
TRIGGER_PIN = GPIO5
ECHO_PIN    = GPIO18
```

You can change them in the sketch if your wiring is different.

Important: most HC-SR04 modules output 5V on ECHO. ESP32 GPIO is 3.3V only, so use a voltage divider or level shifter before `ECHO_PIN`.

## Arduino IDE setup

1. Install the ESP32 board package in Arduino IDE.
2. Select an ESP32 board, for example `ESP32 Dev Module`.
3. Open `ESP32_WIFI_SENDER.ino`.
4. Fill Wi-Fi credentials and `API_URL`.
5. Upload the sketch.
6. Open Serial Monitor at `115200`.

## Expected Serial Monitor output

Successful request:

```text
WiFi connected. IP: ...
Distance cm: 123.45
POST https://.../api/measurements
HTTP code: 201
Response: {...}
```

Common errors:

```text
HTTP code: 400
Response: {"error":"sensor_not_found"}
```

The `SENSOR_ID` in the sketch does not exist in the database or is not active.

```text
HTTP code: -1
```

The ESP32 cannot reach the API URL. Check Wi-Fi, public domain, HTTPS, and Amvera app status.
