#include "RelayModule.h"

RelayModule::RelayModule(uint8_t gpioPin, bool activeHigh, RelayMode mode)
    : gpioPin_(gpioPin), activeHigh_(activeHigh), mode_(mode), state_(RelayState::OFF) {}

bool RelayModule::init() {
    pinMode(gpioPin_, OUTPUT);
    setState(RelayState::OFF); // Ensure safe default
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[Relay] Module initialized on GPIO " + String(gpioPin_));
    return true;
}

void RelayModule::setState(RelayState state) {
    state_ = state;

    bool outputLevel;
    switch (state) {
        case RelayState::ON:
            outputLevel = activeHigh_ ? HIGH : LOW;
            break;
        case RelayState::OFF:
            outputLevel = activeHigh_ ? LOW : HIGH;
            break;
        case RelayState::TOGGLE:
            // Toggle based on current state
            // (This would need to read current pin state, simplified here)
            outputLevel = activeHigh_ ? LOW : HIGH;
            break;
    }

    // Apply inversion if needed
    if (mode_ == RelayMode::INVERTED) {
        outputLevel = !outputLevel;
    }

    digitalWrite(gpioPin_, outputLevel);
    AARUESP_DEBUG_PRINT("[Relay] GPIO " + String(gpioPin_) + " set to ");
    AARUESP_DEBUG_PRINTLN(outputLevel ? "HIGH" : "LOW");
}

void RelayModule::pulse(uint16_t pulseMs) {
    setState(RelayState::ON);
    pulseStart_ = millis();
    pulseDuration_ = pulseMs;
}

void RelayModule::toggle() {
    if (state_ == RelayState::ON) {
        setState(RelayState::OFF);
    } else {
        setState(RelayState::ON);
    }
}

void RelayModule::update() {
    // Handle non-blocking pulse
    if (pulseDuration_ > 0 && pulseStart_ > 0) {
        if (millis() - pulseStart_ >= pulseDuration_) {
            setState(RelayState::OFF);
            pulseStart_ = 0;
            pulseDuration_ = 0;
        }
    }
}

RelayState RelayModule::getState() const {
    return state_;
}

bool RelayModule::isHealthy() const {
    return initialized_ && (gpioPin_ < 40); // Basic validation
}

void RelayModule::setMode(RelayMode mode) {
    mode_ = mode;
}