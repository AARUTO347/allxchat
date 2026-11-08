/**
 * Example: IMU + Light Sensor + OLED with AARUESP
 *
 * Demonstrates the MPU6050 6-axis IMU, the BH1750 light sensor,
 * and the built-in SSD1306 OLED driver working together.
 */

#include <AARUESP.h>
#include <MPU6050Module.h>
#include <BH1750Module.h>
#include <OLEDModule.h>
#include <LEDModule.h>

// Create AARUESP instance
AARUESP aru;

// Modules (I2C on GPIO 21=SDA, GPIO 22=SCL)
MPU6050Module imu(21, 22);
BH1750Module light(21, 22);
OLEDModule display(21, 22, 0x3C); // SDA=21, SCL=22, addr=0x3C
LEDModule led(2);                // GPIO 2 (built-in)

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("=== AARUESP IMU & Light Demo ===");

    // Initialize AARUESP (auto-detects your ESP board)
    if (!aru.begin()) {
        while (1) delay(10);
    }
    Serial.printf("Board detected: %s\n", aru.getBoardName());

    imu.init();
    light.init();
    led.init();
    display.init();

    // Welcome screen
    display.clear();
    display.println(0, "AARUESP Demo");
    display.println(2, "IMU + Light");
    display.display();
    delay(1500);
}

void loop() {
    aru.update();
    imu.update();
    light.update();
    led.update();
    display.update();

    float ax, ay, az;
    imu.getAcceleration(ax, ay, az);
    float gx, gy, gz;
    imu.getGyro(gx, gy, gz);
    float gyroMagnitude = sqrt(gx * gx + gy * gy + gz * gz);
    float lux = light.getLux();

    // Blink LED when strong light is detected
    if (lux > 500) {
        led.on();
    } else {
        led.off();
    }

    // Refresh OLED every 500ms
    static unsigned long lastScreen = 0;
    if (millis() - lastScreen >= 500) {
        lastScreen = millis();
        display.clear();
        display.println(0, "AX:%.1f AY:%.1f", ax, ay);
        display.println(1, "AZ:%.1f", az);
        display.println(2, "Light:%.1f lux", lux);
        display.println(3, "Temp:%.1f C", imu.getTemperature());
        display.println(5, "AARUESP");
        display.println(6, "by AARUTO");
        display.display();
    }

    // Print to serial every 2 seconds
    static unsigned long lastPrint = 0;
    if (millis() - lastPrint >= 2000) {
        lastPrint = millis();
        Serial.printf("Accel: X=%.2f Y=%.2f Z=%.2f | Gyro|: %.2f dps | Light: %.1f lux | Temp: %.1f C\n",
                      ax, ay, az, gyroMagnitude, lux, imu.getTemperature());
    }
}