#pragma once

#include "AARUESP.h"

/**
 * @brief HC-SR501 PIR Motion Sensor Module
 * Digital output; detects motion and supports trigger modes
 */
class HCSR501Module : public aru::Module {
public:
    /**
     * @brief Create a PIR motion sensor module
     * @param gpioPin GPIO pin connected to PIR OUT
     * @param activeHigh True if motion => HIGH (default true)
     */
    HCSR501Module(uint8_t gpioPin, bool activeHigh = true);

    /**
     * @brief Initialize the PIR input pin
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Update motion state
     */
    void update() override;

    /**
     * @brief Check if motion is currently detected
     * @return true if motion detected
     */
    bool isMotionDetected();

    /**
     * @brief Check if motion was just detected (latch until read)
     * @return true if newly triggered since last check
     */
    bool wasMotionDetected();

    /**
     * @brief Get motion detection count
     * @return Number of motion events detected
     */
    uint32_t getMotionCount() const;

    /**
     * @brief Get module type identifier
     * @return "sensor.hcsr501"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    uint8_t gpioPin_;
    bool activeHigh_;
    bool lastState_{LOW};
    bool motion_{false};
    bool latched_{false};
    uint32_t motionCount_{0};
    unsigned long lastUpdate_{0};
    std::string type_ = "sensor.hcsr501";
};