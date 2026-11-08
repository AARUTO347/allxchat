#include "BMP180Module.h"

BMP180Module::BMP180Module(uint8_t sda, uint8_t scl) {}

bool BMP180Module::init() {
    // In real implementation: begin I2C, initialize BMP180
    // For AARUESP framework: mark as initialized
    Wire.begin(sda, scl);
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[BMP180] Module initialized on SDA=" + String(sda) + " SCL=" + String(scl));
    return true;
}

void BMP180Module::update() {
    if (!healthy_ || (millis() - lastRead_ < READ_INTERVAL_)) {
        return;
    }
    
    // Mock readings - real impl would read from BMP180
    temperature_ = 22.5; // Mock: 22.5°C
    pressure_ = 1012.15; // Mock: 1012.15 hPa
    lastRead_ = millis();
    
    AARUESP_DEBUG_PRINT("[BMP180] T=");
    AARUESP_DEBUG_PRINT(temperature_);
    AARUESP_DEBUG_PRINT(" P=");
    AARUESP_DEBUG_PRINTLN(pressure_);
}

float BMP180Module::getTemperature() {
    return temperature_;
}

float BMP180Module::getPressure() {
    return pressure_;
}

bool BMP180Module::isHealthy() const {
    return initialized_ && (millis() - lastRead_ < READ_INTERVAL_ * 2);
}