/**
 * Example: OLED Display with AARUESP
 * 
 * Demonstrates using an SSD1306 OLED display (128x64) with AARUESP.
 * Display connected via I2C (GPIO 21=SDA, GPIO 22=SCL typical).
 */

#include <AARUESP.h>
#include <OLEDModule.h>

// Create AARUESP instance
AARUESP aru;

// Create OLED module (I2C; SDA=21, SCL=22, address 0x3C)
OLEDModule display(21, 22, 0x3C);

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("Initializing AARUESP...");
    if (!aru.begin()) {
        Serial.println("AARUESP initialization failed!");
        while (1) delay(10);
    }
    Serial.println("AARUESP initialized!");
    
    // Initialize the OLED display
    Serial.println("Initializing OLED display...");
    if (!display.init()) {
        Serial.println("OLED initialization failed!");
        // Continue anyway - maybe display was not connected
    } else {
        Serial.println("OLED ready!");
    }
    
    // Clear and show welcome message
    display.clear();
    display.println(0, "AARUESP Library");
    display.println(1, "by AARUTO");
    display.println(3, "OLED Example");
    display.display();
    
    delay(2000);
}

void loop() {
    // Update AARUESP
    aru.update();
    
    // Update display module
    display.update();
    
    // Demo: rotating text/demo
    static unsigned long lastUpdate = 0;
    if (millis() - lastUpdate >= 3000) {
        lastUpdate = millis();
        
        // Clear and show current time/millis
        display.clear();
        display.println(0, "Millis: %u", millis() / 1000);
        display.println(2, "AARUESP Demo");
        display.display();
    }
}