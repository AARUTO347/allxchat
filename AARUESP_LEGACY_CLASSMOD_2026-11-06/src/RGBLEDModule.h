#pragma once

#include "AARUESP.h"

/**
 * @brief RGB LED Module
 * Controls a common-cathode or common-anode RGB LED via PWM
 */
class RGBLEDModule : public aru::Module {
public:
    /**
     * @brief Create an RGB LED module
     * @param rPin Red GPIO pin
     * @param gpin Green GPIO pin
     * @param bPin Blue GPIO pin
     * @param commonCathode True for common-cathode (false = common-anode)
     */
    RGBLEDModule(uint8_t rPin, uint8_t gpin, uint8_t bPin, bool commonCathode = true);

    /**
     * @brief Initialize the RGB LED pins
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Update module state (runs the color cycle when enabled)
     */
    void update() override;

    /**
     * @brief Set RGB color
     * @param r Red component (0-255)
     * @param g Green component (0-255)
     * @param b Blue component (0-255)
     */
    void setColor(uint8_t r, uint8_t g, uint8_t b);

    /**
     * @brief Get current RGB color
     * @return Tuple of (r, g, b)
     */
    void getColor(uint8_t& r, uint8_t& g, uint8_t& b);

    /**
     * @brief Set color using HSV/HSB model
     * @param h Hue (0-360)
     * @param s Saturation (0-100)
     * @param v Value/Brightness (0-100)
     */
    void setColorHSV(float h, float s, float v);

    /**
     * @brief Cycle through colors automatically
     * @param speed_ms Delay between color changes
     */
    void startCycle(uint16_t speed_ms = 20);

    /**
     * @brief Stop automatic cycling
     */
    void stopCycle();

    /**
     * @brief Get module type identifier
     * @return "actuator.rgbled"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    uint8_t rPin_;
    uint8_t gPin_;
    uint8_t bPin_;
    bool commonCathode_;
    uint8_t rValue_{0};
    uint8_t gValue_{0};
    uint8_t bValue_{0};
    unsigned long lastChange_{0};
    uint16_t cycleSpeed_{50};
    bool cycling_{false};
    int hue_{0};
    std::string type_ = "actuator.rgbled";
};