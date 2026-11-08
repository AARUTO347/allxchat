/**
 * Example: LED Blink with AARUESP
 * 
 * Demonstrates controlling an LED using the AARUESP universal library.
 * LED connected to GPIO 2 (built-in LED on many ESP32 boards).
 */

#include <AARUESP.h>
#include <LEDModule.h>

// Create AARUESP instance
AARUESP aru;

// Create LED module on GPIO 2
LEDModule led(2);

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("Initializing AARUESP...");
    if (!aru.begin()) {
        Serial.println("AARUESP initialization failed!");
        while (1) delay(10);
    }
    Serial.println("AARUESP initialized!");
    
    // Initialize the LED module
    Serial.println("Initializing LED...");
    led.init();
    Serial.println("LED ready!");
    
    // Demonstrate LED control
    Serial.println("Turning LED on...");
    led.on();
    delay(1000);
    
    Serial.println("Turning LED off...");
    led.off();
    delay(1000);
    
    Serial.println("Toggling LED...");
    led.toggle();
    delay(1000);
}

void loop() {
    // Update AARUESP
    aru.update();
    
    // Update LED module state
    led.update();
    
    // Blink the LED every second using the module
    static unsigned long lastToggle = 0;
    if (millis() - lastToggle >= 1000) {
        lastToggle = millis();
        led.toggle();
        
        Serial.printf("LED is now: %s\n", led.isOn() ? "ON" : "OFF");
    }
}