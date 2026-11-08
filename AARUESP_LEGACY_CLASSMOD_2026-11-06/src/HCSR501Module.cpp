#include "HCSR501Module.h"

HCSR501Module::HCSR501Module(uint8_t gpioPin, bool activeHigh)
    : gpioPin_(gpioPin), activeHigh_(activeHigh) {}

bool HCSR501Module::init() {
    pinMode(gpioPin_, INPUT);
    lastState_ = digitalRead(gpioPin_);
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[HC-SR501] Module initialized on GPIO " + String(gpioPin_));
    return true;
}

void HCSR501Module::update() {
    if (!initialized_) return;

    int raw = digitalRead(gpioPin_);
    bool state = activeHigh_ ? (raw == HIGH) : (raw == LOW);

    if (state != (lastState_ == (activeHigh_ ? HIGH : LOW))) {
        if (state == true) {
            motionCount_++;
            latched_ = true;
        }
        lastState_ = activeHigh_ ? (state ? HIGH : LOW) : (state ? LOW : HIGH);
    }

    motion_ = state;
    lastUpdate_ = millis();
}

bool HCSR501Module::isMotionDetected() {
    return motion_;
}

bool HCSR501Module::wasMotionDetected() {
    bool result = latched_;
    latched_ = false;
    return result;
}

uint32_t HCSR501Module::getMotionCount() const {
    return motionCount_;
}

bool HCSR501Module::isHealthy() const {
    return initialized_;
}