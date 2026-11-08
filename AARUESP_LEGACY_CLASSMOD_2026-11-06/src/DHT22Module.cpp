#include "DHT22Module.h"

// Mock DHT read - in real implementation would use DHT library
// For AARUESP, we'll provide a basic framework

DHT22Module::DHT22Module(uint8_t gpioPin) : gpioPin_(gpioPin) {}

bool DHT22Module::init() {
    // In a real implementation: dht_.begin(gpioPin_)
    // Here we just set up the pin and mark as initialized
    pinMode(gpioPin_, INPUT);
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[DHT22] Module initialized on GPIO " + String(gpioPin_));
    return true;
}

void DHT22Module::update() {
    if (!healthy_ || (millis() - lastRead_ < READ_INTERVAL_)) {
        return;
    }
    
    // Mock reading - in real implementation: 
    // float t = dht_.readTemperature();
    // float h = dht_.readHumidity();
    // 
    // if (!isnan(t) && !isnan(h)) {
    //     temperature_ = t;
    //     humidity_ = h;
    //     lastRead_ = millis();
    //     AARUESP_DEBUG_PRINT("[DHT22] T=");
    //     AARUESP_DEBUG_PRINT(temperature_);
    //     AARUESP_DEBUG_PRINT(" H=");
    //     AARUESP_DEBUG_PRINTLN(humidity_);
    // }
    
    // For now, just mark as read and use mock values
    temperature_ = 25.0; // Mock: 25°C
    humidity_ = 60.0;    // Mock: 60% humidity
    lastRead_ = millis();
    
    AARUESP_DEBUG_PRINT("[DHT22] T=");
    AARUESP_DEBUG_PRINT(temperature_);
    AARUESP_DEBUG_PRINT(" H=");
    AARUESP_DEBUG_PRINTLN(humidity_);
}

float DHT22Module::getTemperature() {
    return temperature_;
}

float DHT22Module::getHumidity() {
    return humidity_;
}

bool DHT22Module::isHealthy() const {
    return initialized_ && (millis() - lastRead_ < READ_INTERVAL_ * 2);
}