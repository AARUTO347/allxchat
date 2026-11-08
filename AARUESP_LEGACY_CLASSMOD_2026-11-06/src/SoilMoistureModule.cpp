#include "SoilMoistureModule.h"

SoilMoistureModule::SoilMoistureModule(uint8_t analogPin, int dryValue, int wetValue)
    : analogPin_(analogPin), dryValue_(dryValue), wetValue_(wetValue) {}

bool SoilMoistureModule::init() {
    // Configure ADC pin
    // ESP32: ADC attenuation and width configuration would go here
    // ESP8266: analogRead() works on A0
    
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[SoilMoisture] Module initialized on ADC pin " + String(analogPin_));
    return true;
}

void SoilMoistureModule::update() {
    if (!healthy_) return;
    if (millis() - lastRead_ < READ_INTERVAL_) return;
    
    // Read ADC voltage (ESP32 returns 0-4095 for 12-bit)
    rawValue_ = analogRead(analogPin_);
    
    // Convert to percentage (assuming dryValue > wetValue for typical sensors)
    // Higher raw value = drier soil
    if (dryValue_ > wetValue_) {
        // Inverted scaling
        moisture_ = map(rawValue_, dryValue_, wetValue_, 0, 100);
    } else {
        moisture_ = map(rawValue_, wetValue_, dryValue_, 100, 0);
    }
    
    // Clamp to 0-100
    if (moisture_ < 0) moisture_ = 0;
    if (moisture_ > 100) moisture_ = 100;
    
    lastRead_ = millis();
    
    AARUESP_DEBUG_PRINT("[SoilMoisture] Raw=");
    AARUESP_DEBUG_PRINT(rawValue_);
    AARUESP_DEBUG_PRINT(" Moisture=");
    AARUESP_DEBUG_PRINTLN(moisture_);
}

int SoilMoistureModule::getMoisture() {
    return moisture_;
}

int SoilMoistureModule::getRawValue() {
    return rawValue_;
}

bool SoilMoistureModule::isHealthy() const {
    return initialized_;
}