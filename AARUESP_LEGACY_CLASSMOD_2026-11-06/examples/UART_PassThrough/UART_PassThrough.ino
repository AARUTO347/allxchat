/**
 * Example: UART Pass-Through with AARUESP
 * 
 * Demonstrates using the UART module to communicate with external devices.
 * Connect a GPS module, Bluetooth module, or other UART device to the ESP.
 */

#include <AARUESP.h>
#include <UARTModule.h>

// Create AARUESP instance
AARUESP aru;

// Create UART module for GPS module connected to GPIO 16 (RX) and GPIO 17 (TX)
// at 9600 baud
UARTModule gpsSerial(16, 17, 9600);

void setup() {
    // Initialize hardware serial for computer monitoring
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("Initializing AARUESP...");
    if (!aru.begin()) {
        Serial.println("AARUESP initialization failed!");
        while (1) delay(10);
    }
    Serial.println("AARUESP initialized!");
    
    // Initialize the UART module
    Serial.println("Initializing UART for GPS...");
    if (!gpsSerial.init()) {
        Serial.println("UART initialization failed!");
    } else {
        Serial.println("UART ready!");
    }
    
    // Wait a moment for GPS to initialize
    delay(2000);
}

void loop() {
    // Update AARUESP
    aru.update();
    
    // Update UART module
    gpsSerial.update();
    
    // Read any available GPS data
    static unsigned long lastRead = 0;
    if (millis() - lastRead >= 500) {
        lastRead = millis();
        
        // Try to read available data
        if (gpsSerial.available() > 0) {
            // Read up to 31 bytes (leaving room for null terminator)
            uint8_t buffer[32];
            size_t len = gpsSerial.read(buffer, sizeof(buffer) - 1);
            
            if (len > 0) {
                // Print as string (assumed NMEA or similar)
                buffer[len] = '\0'; // Null-terminate
                Serial.print("GPS: ");
                Serial.println((char*)buffer);
            }
        }
        
        // Also echo any hardware serial back through UART module
        if (Serial.available() > 0) {
            char c = Serial.read();
            gpsSerial.write(static_cast<uint8_t>(c));
        }
    }
}