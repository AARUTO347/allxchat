# AARUESP — The Universal ESP Library

**By AARUTO (2026)**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/aaruto/AARUESP)
[![Boards](https://img.shields.io/badge/boards-207-brightgreen.svg)](https://github.com/aaruto/AARUESP)
[![Modules](https://img.shields.io/badge/modules-22-orange.svg)](https://github.com/aaruto/AARUESP)

**AARUESP** is a universal, modular library for **ESP8266** and **ESP32**-family boards.
It gives you one unified API — `AARUESP aru;` — that you can build almost any
IoT project on, with auto-detected boards and a growing set of ready-made modules.

- **200+ board support** — 207 ESP boards registered across the ESP32 / ESP32-S2 / ESP32-S3 / ESP32-C3 / ESP32-C6 / ESP32-H2 / ESP8266 families *(auto detection)*
- **1000+ module support** — a plugin-style module registry with 22 ready-to-use modules and room for thousands more
- **Self-contained** — core modules need no external libraries (only the ESP Arduino core)
- Arduino IDE / PlatformIO / ESPHome compatible, MIT licensed

---

## 📦 What's Inside

```
AARUESP/
├── src/
│   ├── AARUESP.h / AARUESP.cpp     ← Core (board detection + module registry)
│   ├── AARUESP_MODULES.h           ← Master header: pulls in every module
│   ├── boards/
│   │   ├── BoardRegistry.h         ← Board registry API + aruListBoards()
│   │   └── BoardRegistry.cpp       ← 207 board definitions
│   ├── BME280Module.h/.cpp         ← Environmental sensor (I2C)
│   ├── BH1750Module.h/.cpp         ← Ambient light (lux)
│   ├── MPU6050Module.h/.cpp        ← 6-axis IMU (accel + gyro)
│   ├── OLEDModule.h/.cpp           ← SSD1306 128x64 OLED (built-in driver!)
│   ├── … and 18 more modules
├── examples/                       ← 6 full example sketches
├── library.json                    ← Arduino library manifest
└── README.md
```

---

## 🔧 Installation

### Arduino IDE
1. Download or clone this repository
2. Copy the `AARUESP/` folder into your Arduino `libraries/` directory
   (e.g. `Documents/Arduino/libraries/AARUESP/`)
3. Restart the Arduino IDE

### PlatformIO
```ini
lib_deps = D:/1 TOP FILES ALL FOLDER PROJECT/OPENCODE HOMEBASE/AARUESP
; or, when hosted:  aaruto/AARUESP
```

### Include it
```cpp
#include <AARUESP.h>            // Core only
#include <AARUESP_MODULES.h>    // Core + ALL modules
// or just the module you need:
#include <BME280Module.h>
```

---

## ⚡ Quick Start

```cpp
#include <AARUESP.h>
#include <BME280Module.h>
#include <LEDModule.h>

AARUESP aru;
BME280Module sensor(21, 22);   // SDA=21, SCL=22
LEDModule led(2);              // GPIO 2 (built-in LED)

void setup() {
    Serial.begin(115200);
    aru.begin();               // auto-detects board, prints it to Serial
    sensor.init();
    led.init();
}

void loop() {
    aru.update();
    sensor.update();
    led.toggle();
    Serial.println(sensor.getTemperature());
    delay(1000);
}
```

---

## 🧭 Board Detection

```cpp
BoardInfo b = aru().detectBoard();
Serial.printf("Board: %s (%u KB flash, %d GPIOs)\n",
              b.name, b.flash_size / 1024, b.gpio_count);
```

Look up any supported board by name:
```cpp
const BoardInfo* b = getBoardInfo("ESP32S3_BOX");   // case-insensitive fallback
if (b) Serial.println(b->name);
```

The full board list is in `src/boards/BoardRegistry.cpp` — **207 boards** including
ESP32 (latest-silkscreen & classic), ESP-WROOM/WROVER/PICO, Espressif dev kits,
SparkFun/Adafruit/DFRobot/Waveshare/Wemos/Lolin, ESP8266 (NodeMCU, ESP-01…ESP-14, Wemos),
and AARUTO custom boards. Query them at runtime with `aruGetBoardCount()`,
`aruGetAllBoards()`, `aruFindBoard(name)`, or `aruListBoards()`.

---

## 🧩 Module Registry (plugin architecture)

Everything inherits from `aru::Module`:

```cpp
class MyModule : public aru::Module {
public:
    bool init() override   { initialized_ = true; healthy_ = true; return true; }
    void update() override { /* read & cache */ }
    const std::string& getType() const override {
        static std::string t = "category.my"; return t;
    }
    bool isHealthy() const override { return initialized_; }
};
```

Register modules and use a consistent lifecycle:
```cpp
aru.registerModule("myModule", new MyModule());   // takes ownership
aru.update();                                     // inside loop()
aruModuleHealthy("myModule");                     // quick health check
aru.listModules();                                // std::vector<std::string>
```

### Included modules (22)

| Category | Module | Notes |
|---|---|---|
| Sensors | `BME280Module` | Temp / humidity / pressure (I2C, self-contained) |
| Sensors | `BMP180Module` | Pressure / temperature (I2C skeleton) |
| Sensors | `DHT22Module` | Temp / humidity (data pin) |
| Sensors | `BH1750Module` | Ambient light in lux (I2C) |
| Sensors | `MPU6050Module` | 6-axis accelerometer + gyroscope (I2C) |
| Sensors | `HCSR04Module` | Ultrasonic distance (TRIG/ECHO) |
| Sensors | `HCSR501Module` | PIR motion sensor |
| Sensors | `MQ2Module` | Gas / smoke (analog) |
| Sensors | `ACS712Module` | Current (5A / 20A / 30A) |
| Sensors | `SoilMoistureModule` | Capacitive/resistive moisture |
| Input | `PotentiometerModule` | Analog input (0-100%) |
| Input | `ButtonModule` | Debounced, clicks & hold |
| Input | `EncoderModule` | Rotary A/B quadrature + button |
| Actuators | `LEDModule` | Simple LED / PWM brightness |
| Actuators | `RGBLEDModule` | RGB with HSV support |
| Actuators | `RelayModule` | Direct / inverted, timed pulses |
| Actuators | `ServoModule` | 0-180° + auto-sweep |
| Actuators | `BuzzerModule` | Tones + melodies |
| Displays | `OLEDModule` | SSD1306 128×64 I2C with built-in 5×7 text driver |
| Comms | `UARTModule` | Passthrough for GPS / BT / serial |
| Comms | `WiFiModule` | Auto-connect + reconnect manager |

---

## 🛠️ Examples

- `examples/BME280_Demo` — environment sensor + board info
- `examples/LED_Blink` — LED control basics
- `examples/OLED_Display` — display text with the built-in driver
- `examples/UART_PassThrough` — serial passthrough to a GPS-style module
- `examples/Multi_Sensor_Dashboard` — BME280 + DHT22 + OLED + button + servo
- `examples/IMU_Light_Demo` — MPU6050 + BH1750 + OLED

---

## 📜 License

MIT — see the LICENSE file.

## 🤝 Support

Issues & ideas: **https://github.com/aaruto/AARUESP** or aaruto@example.com