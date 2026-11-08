#include "BuzzerModule.h"

BuzzerModule::BuzzerModule(uint8_t gpioPin) : gpioPin_(gpioPin) {}

bool BuzzerModule::init() {
    pinMode(gpioPin_, OUTPUT);
    digitalWrite(gpioPin_, LOW);
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[Buzzer] Module initialized on GPIO " + String(gpioPin_));
    return true;
}

void BuzzerModule::tone(uint16_t frequency, uint16_t durationMs) {
    playing_ = true;
    toneStart_ = millis();
    toneDuration_ = durationMs;

#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
    // Arduino-ESP32 provides global tone()/noTone(); disambiguate from member
    ::tone(gpioPin_, frequency, durationMs);
#elif defined(ESP8266)
    ::tone(gpioPin_, frequency, durationMs);
#else
    // Generic fallback: simple digital toggle per period is not practical
    // here, so just drive high/low as a rough beep
    digitalWrite(gpioPin_, HIGH);
#endif

    AARUESP_DEBUG_PRINT("[Buzzer] Tone ");
    AARUESP_DEBUG_PRINT(frequency);
    AARUESP_DEBUG_PRINTLN(" Hz");
}

void BuzzerModule::noTone() {
    playing_ = false;
    toneDuration_ = 0;
#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
    ::noTone(gpioPin_);
#elif defined(ESP8266)
    ::noTone(gpioPin_);
#endif
    digitalWrite(gpioPin_, LOW);
    AARUESP_DEBUG_PRINTLN("[Buzzer] Tone stopped");
}

void BuzzerModule::beep(uint16_t durationMs) {
    tone(1000, durationMs); // 1kHz beep
}

void BuzzerModule::playMelody(const uint16_t* notes, const uint16_t* durations, size_t length) {
    for (size_t i = 0; i < length; i++) {
        if (notes[i] == 0) {
            delay(durations[i]); // Rest
        } else {
            tone(notes[i], durations[i]);
            delay(durations[i]);
        }
        delay(30); // Small gap between notes
    }
}

void BuzzerModule::update() {
    if (playing_ && toneDuration_ > 0) {
        if (millis() - toneStart_ >= toneDuration_) {
            noTone();
        }
    }
}

bool BuzzerModule::isHealthy() const {
    return initialized_;
}