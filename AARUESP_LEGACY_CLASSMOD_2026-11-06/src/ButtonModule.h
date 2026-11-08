#pragma once

#include "AARUESP.h"

/**
 * @brief Button Module
 * Debounced button input with short press/long press detection
 */
class ButtonModule : public aru::Module {
public:
    enum class ButtonState { RELEASED, PRESSED, HOLD, DOUBLE_CLICK, TRIPLE_CLICK };
    enum class PullMode { INPUT_PULLUP, INPUT_PULLDOWN, INPUT };

    /**
     * @brief Create a button module
     * @param gpioPin GPIO pin connected to button
     * @param pull Pull mode (default: INPUT_PULLUP)
     * @param debounceMs Debounce time in ms (default: 50)
     * @param holdMs Hold time in ms before triggering HOLD (default: 1000)
     */
    ButtonModule(uint8_t gpioPin, PullMode pull = PullMode::INPUT_PULLUP,
                 uint16_t debounceMs = 50, uint16_t holdMs = 1000);

    /**
     * @brief Initialize the button pin
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Update button state (call periodically, typically in loop())
     */
    void update() override;

    /**
     * @brief Get current button state
     * @return ButtonState enum
     */
    ButtonState getState() const;

    /**
     * @brief Check if button was just pressed (fell from released to pressed)
     * @return true if just pressed
     */
    bool wasPressed();

    /**
     * @brief Check if button was just released (rose from pressed to released)
     * @return true if just released
     */
    bool wasReleased();

    /**
     * @brief Check if button is currently held down
     * @return true if held
     */
    bool isHeld() const;

    /**
     * @brief Get number of clicks detected since last check
     * @return 0=none, 1=single, 2=double, 3=triple
     */
    int getClicks();

    /**
     * @brief Reset click counter
     */
    void resetClicks();

    /**
     * @brief Get module type identifier
     * @return "input.button"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    uint8_t gpioPin_;
    PullMode pull_;
    uint16_t debounceMs_;
    uint16_t holdMs_;
    
    bool lastState_{HIGH}; // Default for INPUT_PULLUP
    bool lastDebounced_{HIGH};
    unsigned long lastChange_{0};
    unsigned long pressStart_{0};
    unsigned long holdStart_{0};
    unsigned long lastClick_{0};
    
    int clickCount_{0};
    bool justPressed_{false};
    bool justReleased_{false};
    
    std::string type_ = "input.button";
};