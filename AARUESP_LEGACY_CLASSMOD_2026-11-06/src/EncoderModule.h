#pragma once

#include "AARUESP.h"

/**
 * @brief Rotary Encoder Module
 * Tracks position and direction of a standard A/B quadrature encoder
 * with optional push button.
 */
class EncoderModule : public aru::Module {
public:
    EncoderModule(uint8_t pinA, uint8_t pinB, uint8_t buttonPin = 255, bool usePullup = true);

    /**
     * @brief Initialize the encoder pins
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Poll encoder pins and update position
     */
    void update() override;

    /**
     * @brief Get absolute position (steps)
     * @return Signed position count
     */
    long getPosition() const;

    /**
     * @brief Get delta since last read; clears the delta
     * @return Signed change in steps
     */
    long getDelta();

    /**
     * @brief Reset the position to zero
     */
    void reset();

    /**
     * @brief Check if the push button is pressed
     * @return true if button currently pressed
     */
    bool isButtonPressed() const;

    /**
     * @brief Check if button was just pressed (latched)
     * @return true if newly pressed since last call
     */
    bool wasButtonPressed();

    /**
     * @brief Get module type identifier
     * @return "input.encoder"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    uint8_t pinA_;
    uint8_t pinB_;
    uint8_t buttonPin_;
    bool usePullup_;
    long position_{0};
    long delta_{0};
    volatile long counter_{0};
    uint8_t lastState_{0};
    bool buttonLatched_{false};
    bool buttonLast_{false};
    std::string type_ = "input.encoder";
};