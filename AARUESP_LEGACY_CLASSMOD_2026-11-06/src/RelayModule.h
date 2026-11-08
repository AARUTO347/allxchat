#pragma once

#include "AARUESP.h"

/**
 * @brief Relay Module
 * Controls a relay module (e.g., HC-595 or direct GPIO control)
 * Can handle both digital on/off and pulse-width control
 */
class RelayModule : public aru::Module {
public:
    enum class RelayState { OFF, ON, TOGGLE };
    enum class RelayMode { DIRECT, INVERTED };

    /**
     * @brief Create a relay module instance
     * @param gpioPin GPIO pin connected to relay control
     * @param activeHigh True if relay is activated by HIGH signal (default: true)
     * @param mode Relay wiring mode
     */
    RelayModule(uint8_t gpioPin, bool activeHigh = true, RelayMode mode = RelayMode::DIRECT);

    /**
     * @brief Initialize the relay pin
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Update module state (handles non-blocking pulse timing)
     */
    void update() override;

    /**
     * @brief Set relay state
     * @param state Desired state (ON, OFF, TOGGLE)
     */
    void setState(RelayState state);

    /**
     * @brief Get current relay state
     * @return RelayState enum
     */
    RelayState getState() const;

    /**
     * @brief Pulse the relay on for specified milliseconds, then off
     * @param pulseMs Pulse duration in milliseconds
     */
    void pulse(uint16_t pulseMs);

    /**
     * @brief Toggle relay state
     */
    void toggle();

    /**
     * @brief Get module type identifier
     * @return "actuator.relay"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

    /**
     * @brief Set relay mode (direct or inverted)
     * @param mode RelayMode enum
     */
    void setMode(RelayMode mode);

private:
    uint8_t gpioPin_;
    bool activeHigh_;
    RelayMode mode_;
    RelayState state_;
    unsigned long pulseStart_{0};
    uint16_t pulseDuration_{0};
    std::string type_ = "actuator.relay";
};