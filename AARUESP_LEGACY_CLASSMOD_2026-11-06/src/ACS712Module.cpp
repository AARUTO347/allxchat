#include "ACS712Module.h"

ACS712Module::ACS712Module(uint8_t analogPin, ACS712Type type, float vRef)
    : analogPin_(analogPin), variant_(type), vRef_(vRef) {}

bool ACS712Module::init() {
    pinMode(analogPin_, INPUT);
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[ACS712] Module initialized on ADC pin " + String(analogPin_));
    return true;
}

void ACS712Module::update() {
    if (!healthy_) return;
    if (millis() - lastRead_ < READ_INTERVAL_) return;

    rawValue_ = analogRead(analogPin_);

    // Mid-scale (VCC/2) is zero current. Sensitivity depends on variant.
    float sensitivity = getSensitivity(); // V/A
    float zeroPoint = (vRef_ / 2.0f);     // mV offset as volts

    float voltage = (rawValue_ / 4095.0f) * vRef_;
    current_ = fabs(voltage - zeroPoint) / sensitivity;

    lastRead_ = millis();
}

float ACS712Module::getCurrent() {
    return current_;
}

int ACS712Module::getRawValue() {
    return rawValue_;
}

float ACS712Module::getSensitivity() const {
    switch (variant_) {
        case ACS712Type::ACS712_5A:  return 0.185f;
        case ACS712Type::ACS712_20A: return 0.100f;
        case ACS712Type::ACS712_30A: return 0.066f;
        default: return 0.185f;
    }
}

bool ACS712Module::isHealthy() const {
    return initialized_;
}