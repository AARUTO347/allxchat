#pragma once

#include "AARUESP.h"

/**
 * @brief Generic LED Control Module
 * Controls a single LED connected to a GPIO pin
 */
class LEDModule : public aru::Module {
public:
    LEDModule(uint8_t gpioPin);

    /**
     * @brief Initialize the LED pin
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Turn LED on
     */
    void on();

    /**
     * @brief Turn LED off
     */
    void off();

    /**
     * @brief Toggle LED state
     */
    void toggle();

    /**
     * @brief Set LED brightness (PWM, 0-255 for basic, or just on/off)
     * @param brightness 0-255
     */
    void setBrightness(uint8_t brightness);

    /**
     * @brief Get current brightness
     * @return 0-255
     */
    uint8_t getBrightness() const;

    /**
     * @brief Update module state
     */
    void update() override;

    /**
     * @brief Get module type identifier
     * @return "actuator.led"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if LED is on
     * @return true if on
     */
    bool isOn() const;

    /**
     * @brief Check if module is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    uint8_t gpioPin_;
    uint8_t brightness_{0};
    bool state_{false};
    std::string type_ = "actuator.led";
};