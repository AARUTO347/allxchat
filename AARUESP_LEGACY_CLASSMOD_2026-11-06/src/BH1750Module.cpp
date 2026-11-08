#include "BH1750Module.h"

#define BH1750_CMD_CONT_HRES 0x10 // Continuous high resolution mode

BH1750Module::BH1750Module(uint8_t sda, uint8_t scl, uint8_t addr)
    : sda_(sda), scl_(scl), addr_(addr) {}

bool BH1750Module::init() {
    Wire.begin(sda_, scl_);

    Wire.beginTransmission(addr_);
    Wire.write(BH1750_CMD_CONT_HRES);
    Wire.endTransmission();

    // Test presence
    Wire.beginTransmission(addr_);
    bool present = (Wire.endTransmission() == 0);

    initialized_ = true;
    healthy_ = present;

    if (present) {
        AARUESP_DEBUG_PRINTLN("[BH1750] Sensor initialized (continuous H-res)");
    } else {
        AARUESP_DEBUG_PRINTLN("[BH1750] Sensor not found at 0x" + String(addr_, HEX));
    }
    return present;
}

void BH1750Module::update() {
    if (!healthy_) return;
    if (millis() - lastRead_ < READ_INTERVAL_) return;

    Wire.requestFrom(addr_, (uint8_t)2);
    if (Wire.available() >= 2) {
        uint16_t raw = ((uint16_t)Wire.read() << 8) | Wire.read();
        lux_ = raw / 1.2f;
    }

    lastRead_ = millis();
}

float BH1750Module::getLux() {
    return lux_;
}

bool BH1750Module::isHealthy() const {
    return initialized_ && healthy_;
}