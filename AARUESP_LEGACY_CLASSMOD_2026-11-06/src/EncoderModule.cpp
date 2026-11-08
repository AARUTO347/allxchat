#include "EncoderModule.h"

EncoderModule::EncoderModule(uint8_t pinA, uint8_t pinB, uint8_t buttonPin, bool usePullup)
    : pinA_(pinA), pinB_(pinB), buttonPin_(buttonPin), usePullup_(usePullup) {}

bool EncoderModule::init() {
    if (usePullup_) {
        pinMode(pinA_, INPUT_PULLUP);
        pinMode(pinB_, INPUT_PULLUP);
        if (buttonPin_ != 255) pinMode(buttonPin_, INPUT_PULLUP);
    } else {
        pinMode(pinA_, INPUT);
        pinMode(pinB_, INPUT);
        if (buttonPin_ != 255) pinMode(buttonPin_, INPUT);
    }
    lastState_ = (digitalRead(pinA_) << 1) | digitalRead(pinB_);
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[Encoder] Module initialized on A=" + String(pinA_) + " B=" + String(pinB_));
    return true;
}

void EncoderModule::update() {
    if (!initialized_) return;

    uint8_t state = (digitalRead(pinA_) << 1) | digitalRead(pinB_);
    if (state == lastState_) {
        // still check button
        if (buttonPin_ != 255) {
            bool pressed = usePullup_ ? (digitalRead(buttonPin_) == LOW) : (digitalRead(buttonPin_) == HIGH);
            if (pressed && !buttonLast_) buttonLatched_ = true;
            buttonLast_ = pressed;
        }
        return;
    }

    // Decode A/B quadrature transition
    int8_t dir = 0;
    switch (lastState_) {
        case 0b00: dir = (state == 0b01) ? +1 : (state == 0b10 ? -1 : 0); break;
        case 0b01: dir = (state == 0b11) ? +1 : (state == 0b00 ? -1 : 0); break;
        case 0b11: dir = (state == 0b10) ? +1 : (state == 0b01 ? -1 : 0); break;
        case 0b10: dir = (state == 0b00) ? +1 : (state == 0b11 ? -1 : 0); break;
    }

    if (dir != 0) {
        position_ += dir;
        delta_ += dir;
    }

    // Button handling
    if (buttonPin_ != 255) {
        bool pressed = usePullup_ ? (digitalRead(buttonPin_) == LOW) : (digitalRead(buttonPin_) == HIGH);
        if (pressed && !buttonLast_) buttonLatched_ = true;
        buttonLast_ = pressed;
    }

    lastState_ = state;
}

long EncoderModule::getPosition() const {
    return position_;
}

long EncoderModule::getDelta() {
    long d = delta_;
    delta_ = 0;
    return d;
}

void EncoderModule::reset() {
    position_ = 0;
    delta_ = 0;
}

bool EncoderModule::isButtonPressed() const {
    if (buttonPin_ == 255) return false;
    return usePullup_ ? (digitalRead(buttonPin_) == LOW) : (digitalRead(buttonPin_) == HIGH);
}

bool EncoderModule::wasButtonPressed() {
    bool result = buttonLatched_;
    buttonLatched_ = false;
    return result;
}

bool EncoderModule::isHealthy() const {
    return initialized_;
}