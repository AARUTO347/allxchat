#include "PotentiometerModule.h"

PotentiometerModule::PotentiometerModule(uint8_t analogPin) : analogPin_(analogPin) {}

bool PotentiometerModule::init() {
    pinMode(analogPin_, INPUT);
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[Potentiometer] Module initialized on ADC pin " + String(analogPin_));
    return true;
}

void PotentiometerModule::update() {
    if (millis() - lastRead_ < READ_INTERVAL_) return;
    rawValue_ = analogRead(analogPin_);
    lastRead_ = millis();
}

int PotentiometerModule::getRawValue() {
    return rawValue_;
}

int PotentiometerModule::getPercent() {
    return (int)((rawValue_ / 4095.0f) * 100.0f);
}

bool PotentiometerModule::isHealthy() const {
    return initialized_;
}