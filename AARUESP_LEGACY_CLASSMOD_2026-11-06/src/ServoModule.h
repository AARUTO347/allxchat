#pragma once

#include "AARUESP.h"

/**
 * @brief Servo Motor Module
 * Control for servo motors (typically 0-180 degree range)
 */
class ServoModule : public aru::Module {
public:
    /**
     * @brief Create a servo module instance
     * @param gpioPin GPIO pin connected to servo signal wire
     */
    ServoModule(uint8_t gpioPin);

    /**
     * @brief Initialize the servo
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Update module state (drives auto-sweep if enabled)
     */
    void update() override;

    /**
     * @brief Set servo angle (0-180 degrees)
     * @param angle Angle in degrees (0-180)
     */
    void setAngle(int angle);

    /**
     * @brief Get current servo angle
     * @return Angle in degrees (0-180)
     */
    int getAngle() const;

    /**
     * @brief Move servo to a percentage of full range (0-100%)
     * @param percent 0.0 to 100.0
     */
    void setPercent(float percent);

    /**
     * @brief Sweep servo back and forth automatically
     * @param speed_ms Delay between steps in milliseconds (lower = faster)
     */
    void startSweep(uint16_t speed_ms = 20);

    /**
     * @brief Stop automatic sweeping
     */
    void stopSweep();

    /**
     * @brief Get module type identifier
     * @return "actuator.servo"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy (servo responding)
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    uint8_t gpioPin_;
    int angle_{90}; // Default to 90 degrees
    unsigned long lastMove_{0};
    uint16_t sweepSpeed_{20};
    bool sweeping_{false};
    int sweepDirection_{1}; // 1 = increasing, -1 = decreasing
    std::string type_ = "actuator.servo";
};