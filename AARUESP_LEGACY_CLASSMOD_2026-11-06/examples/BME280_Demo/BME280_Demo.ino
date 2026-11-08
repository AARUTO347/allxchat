/**
 * Example: BME280 Sensor with AARUESP
 * 
 * Demonstrates initializing and reading from a BME280 sensor
 * using the AARUESP universal library.
 */

#include <AARUESP.h>
#include <BME280Module.h>

// Create AARUESP instance
AARUESP aru;

// Create BME280 module instance (GPIO 21=SDA, GPIO 22=SCL by default)
BME280Module bme280(21, 22);

void setup() {
    // Initialize serial for debugging
    Serial.begin(115200);
    delay(1000);
    
    // Initialize AARUESP (detects board automatically)
    Serial.println("Initializing AARUESP...");
    if (!aru.begin()) {
        Serial.println("AARUESP initialization failed!");
        while (1) delay(10); // Halt
    }
    Serial.println("AARUESP initialized!");
    
    // Detect and print board info
    BoardInfo board = aru.detectBoard();
    Serial.printf("Detected board: %s (Type: %d)\n", board.name, (int)board.type);
    
    // Initialize the BME280 module
    Serial.println("Initializing BME280 sensor...");
    if (!bme280.init()) {
        Serial.println("BME280 initialization failed!");
        while (1) delay(10); // Halt
    }
    Serial.println("BME280 ready!");
    
    // Print module info
    Serial.printf("Module type: %s\n", bme280.getType().c_str());
    Serial.printf("Module healthy: %s\n", bme280.isHealthy() ? "yes" : "no");
}

void loop() {
    // Update AARUESP (processes all registered modules)
    aru.update();
    
    // Update the BME280 module (reads new sensor data)
    bme280.update();
    
    // Print readings every 2 seconds
    static unsigned long lastPrint = 0;
    if (millis() - lastPrint >= 2000) {
        lastPrint = millis();
        
        Serial.print("Temperature: "); Serial.print(bme280.getTemperature()); Serial.println(" °C");
        Serial.print("Humidity: "); Serial.print(bme280.getHumidity()); Serial.println(" %");
        Serial.print("Pressure: "); Serial.print(bme280.getPressure()); Serial.println(" hPa");
        Serial.println("---");
    }
}