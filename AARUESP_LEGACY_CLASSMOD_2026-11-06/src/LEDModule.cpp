#include "LEDModule.h"

LEDModule::LEDModule(uint8_t gpioPin) : gpioPin_(gpioPin) {}

bool LEDModule::init() {
    pinMode(gpioPin_, OUTPUT);
    off(); // Start with LED off
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[LED] Module initialized on GPIO " + String(gpioPin_));
    return true;
}

void LEDModule::on() {
    digitalWrite(gpioPin_, HIGH);
    state_ = true;
    brightness_ = 255;
}

void LEDModule::off() {
    digitalWrite(gpioPin_, LOW);
    state_ = false;
    brightness_ = 0;
}

void LEDModule::toggle() {
    if (state_) {
        off();
    } else {
        on();
    }
}

void LEDModule::setBrightness(uint8_t brightness) {
    brightness_ = brightness;
    analogWrite(gpioPin_, brightness);
}

uint8_t LEDModule::getBrightness() const {
    return brightness_;
}

void LEDModule::update() {
    // LED state is deterministic based on on/off/toggle
    // Could add fade effects, blinking, etc. here
}

bool LEDModule::isOn() const {
    return state_;
}

bool LEDModule::isHealthy() const {
#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32) || defined(ESP8266)
    return initialized_ && (gpioPin_ < 40);
#else
    return initialized_;
#endif
}