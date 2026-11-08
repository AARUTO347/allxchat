#include "MQ2Module.h"

MQ2Module::MQ2Module(uint8_t analogPin, uint8_t digitalPin)
    : analogPin_(analogPin), digitalPin_(digitalPin) {}

bool MQ2Module::init() {
    pinMode(analogPin_, INPUT);
    if (digitalPin_ != 255) {
        pinMode(digitalPin_, INPUT);
    }
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[MQ2] Module initialized on ADC pin " + String(analogPin_));
    return true;
}

void MQ2Module::update() {
    if (!healthy_) return;
    if (millis() - lastRead_ < READ_INTERVAL_) return;
    
    rawValue_ = analogRead(analogPin_);
    
    if (digitalPin_ != 255) {
        smokeDetected_ = (digitalRead(digitalPin_) == HIGH);
    } else {
        smokeDetected_ = rawValue_ > 1000; // Basic threshold
    }
    
    lastRead_ = millis();
    
    AARUESP_DEBUG_PRINT("[MQ2] Raw=");
    AARUESP_DEBUG_PRINT(rawValue_);
    AARUESP_DEBUG_PRINT(" Smoke=");
    AARUESP_DEBUG_PRINTLN(smokeDetected_ ? "YES" : "no");
}

int MQ2Module::getRawValue() {
    return rawValue_;
}

float MQ2Module::getGasPPM() {
    // Rough conversion - actual calibration requires reference resistor
    float voltage = (rawValue_ / 4095.0) * 5.0;
    float rsOnR0 = (5.0 - voltage) / voltage;
    float ppm = pow(10.0, (log10(rsOnR0) - 1.5) / -0.4); // Approximate
    return ppm;
}

bool MQ2Module::isSmokeDetected() {
    return smokeDetected_;
}

bool MQ2Module::isHealthy() const {
    return initialized_;
}