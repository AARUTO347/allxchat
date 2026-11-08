#pragma once

#include "AARUESP.h"

/**
 * @brief Buzzer/Piezo Module
 * Controls piezo buzzers and generates tones
 */
class BuzzerModule : public aru::Module {
public:
    BuzzerModule(uint8_t gpioPin);

    /**
     * @brief Initialize the buzzer pin
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Play a tone at frequency for duration
     * @param frequency Frequency in Hz
     * @param durationMs Duration in milliseconds
     */
    void tone(uint16_t frequency, uint16_t durationMs);

    /**
     * @brief Stop any playing tone
     */
    void noTone();

    /**
     * @brief Play a simple beep
     * @param durationMs Duration in milliseconds (default 200)
     */
    void beep(uint16_t durationMs = 200);

    /**
     * @brief Play a melody from note array
     * @param notes Array of frequency values (0 = rest)
     * @param durations Array of note durations in ms
     * @param length Number of notes
     */
    void playMelody(const uint16_t* notes, const uint16_t* durations, size_t length);

    /**
     * @brief Update buzzer (handles non-blocking tones)
     */
    void update() override;

    /**
     * @brief Get module type identifier
     * @return "actuator.buzzer"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    uint8_t gpioPin_;
    unsigned long toneStart_{0};
    uint16_t toneDuration_{0};
    bool playing_{false};
    std::string type_ = "actuator.buzzer";
};