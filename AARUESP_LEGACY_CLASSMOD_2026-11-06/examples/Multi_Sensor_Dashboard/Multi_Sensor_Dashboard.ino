/**
 * Example: Multi-Sensor Dashboard with AARUESP
 * 
 * Demonstrates using multiple AARUESP modules together:
 * - BME280 for environmental data
 * - DHT22 for temperature/humidity redundancy
 * - LED for status indication
 * - OLED for display
 * - Button for user input
 * - Servo for motor control
 */

#include <AARUESP.h>
#include <BME280Module.h>
#include <DHT22Module.h>
#include <LEDModule.h>
#include <OLEDModule.h>
#include <ButtonModule.h>
#include <ServoModule.h>

// Create AARUESP instance
AARUESP aru;

// Create modules
BME280Module bme280(21, 22);     // I2C: SDA=21, SCL=22
DHT22Module dht22(15);           // GPIO 15
LEDModule led(2);                // GPIO 2 (built-in)
OLEDModule display(21, 22, 0x3C); // SDA=21, SCL=22, addr=0x3C
ButtonModule btn(0);            // GPIO 0 (User button on many dev boards)
ServoModule servo(4);            // GPIO 4 (servo signal)

// State variables
unsigned long lastDisplayUpdate = 0;
const unsigned long DISPLAY_INTERVAL = 3000;

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("=== AARUESP Multi-Sensor Dashboard ===");
    Serial.println("Initializing AARUESP system...");
    
    // Initialize AARUESP (auto-detects board)
    if (!aru.begin()) {
        Serial.println("AARUESP initialization FAILED!");
        while (1) delay(10);
    }
    Serial.println("AARUESP initialized successfully!");
    
    // Detect and display board info
    // Note: getBoardInfo() would need to be added to AARUESP class or accessed differently
    Serial.printf("Board detected: %s\n", aru.getBoardName());
    
    // Initialize all modules
    Serial.println("Initializing modules...");
    
    if (!bme280.init()) {
        Serial.println("WARNING: BME280 initialization failed!");
    } else {
        Serial.println("BME280 initialized");
    }
    
    if (!dht22.init()) {
        Serial.println("WARNING: DHT22 initialization failed!");
    } else {
        Serial.println("DHT22 initialized");
    }
    
    led.init();
    Serial.println("LED initialized");
    
    if (!display.init()) {
        Serial.println("WARNING: OLED initialization failed!");
    } else {
        Serial.println("OLED initialized");
        // Show welcome screen
        display.clear();
        display.println(0, "AARUESP Dashboard");
        display.println(2, "Multi-Sensor Demo");
        display.display();
        delay(2000);
    }
    
    btn.init();
    Serial.println("Button initialized");
    
    servo.init();
    servo.setAngle(90); // Center position
    Serial.println("Servo initialized");
    
    Serial.println("=== All systems ready! ===");
    Serial.println("Watch the serial monitor for sensor data.");
}

void loop() {
    // Update AARUESP (processes internal state)
    aru.update();
    
    // Update all modules
    bme280.update();
    dht22.update();
    led.update();
    display.update();
    btn.update();
    servo.update();
    
    // Read sensor data
    float bmeTemp = bme280.getTemperature();
    float bmeHum = bme280.getHumidity();
    float dhtTemp = dht22.getTemperature();
    float dhtHum = dht22.getHumidity();
    
    // Button handling
    if (btn.wasPressed()) {
        // Toggle LED on button press
        led.toggle();
        Serial.println("Button pressed - LED toggled");
    }
    
    // Servo control based on button hold
    if (btn.isHeld()) {
        static unsigned long servoStart = 0;
        if (millis() - servoStart > 2000) {
            servoStart = millis();
            servo.setAngle(servo.getAngle() == 0 ? 180 : 0);
            Serial.printf("Servo moved to %d degrees\n", servo.getAngle());
        }
    }
    
    // Display updates every few seconds
    if (millis() - lastDisplayUpdate >= DISPLAY_INTERVAL) {
        lastDisplayUpdate = millis();
        
        // Show sensor data on OLED
        if (display.isHealthy()) {
            display.clear();
            display.println(0, "T: %.1f C", dhtTemp);
            display.println(2, "H: %.1f %%", dhtHum);
            display.println(4, "LED: %s", led.isOn() ? "ON" : "OFF");
            display.display();
        }
    }
    
    // Print sensor data to serial monitor
    static unsigned long lastSerial = 0;
    if (millis() - lastSerial >= 2000) {
        lastSerial = millis();
        Serial.printf("BME280: T=%.1f H=%.1f | DHT22: T=%.1f H=%.1f | LED=%s | Servo=%d°\n",
            bmeTemp, bmeHum, dhtTemp, dhtHum, led.isOn() ? "ON" : "OFF", servo.getAngle());
    }
}