#include "ButtonModule.h"

ButtonModule::ButtonModule(uint8_t gpioPin, PullMode pull, uint16_t debounceMs, uint16_t holdMs)
    : gpioPin_(gpioPin), pull_(pull), debounceMs_(debounceMs), holdMs_(holdMs) {}

bool ButtonModule::init() {
    // Set up pin based on pull mode
    switch (pull_) {
        case PullMode::INPUT_PULLUP:
            pinMode(gpioPin_, INPUT_PULLUP);
            lastState_{HIGH};
            lastDebounced_{HIGH};
            break;
        case PullMode::INPUT_PULLDOWN:
            pinMode(gpioPin_, INPUT_PULLDOWN);
            lastState_{LOW};
            lastDebounced_{LOW};
            break;
        case PullMode::INPUT:
        default:
            pinMode(gpioPin_, INPUT);
            lastState_{digitalRead(gpioPin_)};
            lastDebounced_{lastState_};
            break;
    }
    
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[Button] Module initialized on GPIO " + String(gpioPin_));
    return true;
}

void ButtonModule::update() {
    if (!initialized_) return;
    
    bool rawState;
    switch (pull_) {
        case PullMode::INPUT_PULLUP:
            rawState = digitalRead(gpioPin_);
            break;
        case PullMode::INPUT_PULLDOWN:
            rawState = !digitalRead(gpioPin_); // Invert for PULLDOWN
            break;
        case PullMode::INPUT:
        default:
            rawState = digitalRead(gpioPin_);
            break;
    }
    
    unsigned long now = millis();
    
    // Debouncing
    if (rawState != lastDebounced_) {
        if (now - lastChange_ > debounceMs_) {
            lastDebounced_ = rawState;
            lastChange_ = now;
            
            // State changed
            if (rawState != lastState_) {
                lastState_ = rawState;
                
                // Falling edge (button pressed for PULLUP, released for PULLDOWN)
                bool pressed = (pull_ == PullMode::INPUT_PULLUP) ? (rawState == LOW) : (rawState == HIGH);
                
                if (pressed) {
                    pressStart_ = now;
                    justPressed_ = true;
                    justReleased_ = false;
                } else {
                    justReleased_ = true;
                    justPressed_ = false;
                    
                    // Check for hold
                    if (holdStart_ > 0 && (now - holdStart_ > holdMs_)) {
                        // Trigger HOLD event
                        holdStart_ = 0;
                    }
                }
            }
        }
    }
    
    // Hold detection
    if (lastState_ == (pull_ == PullMode::INPUT_PULLUP ? LOW : HIGH) && holdStart_ == 0) {
        holdStart_ = now;
    } else if (lastState_ != (pull_ == PullMode::INPUT_PULLUP ? LOW : HIGH) && holdStart_ > 0) {
        holdStart_ = 0;
    }
    
    // Click detection
    if (justPressed_) {
      justPressed_ = false;
    }
    if (justReleased_) {
        justReleased_ = false;
        // Check for double/triple click
        if (now - lastClick_ < 500) { // Double-click window
            clickCount_++;
            if (clickCount_ >= 2) {
                // Triple or quicker double
            }
        } else {
            // Single click
            clickCount_ = 1;
        }
        lastClick_ = now;
    }
}

ButtonState ButtonModule::getState() const {
    // Return current state based on internal tracking
    // This is simplified - full impl would track all states
    return ButtonState::RELEASED; // Placeholder
}

bool ButtonModule::wasPressed() {
    bool result = justPressed_;
    justPressed_ = false;
    return result;
}

bool ButtonModule::wasReleased() {
    bool result = justReleased_;
    justReleased_ = false;
    return result;
}

bool ButtonModule::isHeld() const {
    // Simplified hold check
    return false;
}

int ButtonModule::getClicks() {
    int result = clickCount_;
    clickCount_ = 0;
    return result;
}

void ButtonModule::resetClicks() {
    clickCount_ = 0;
}

bool ButtonModule::isHealthy() const {
    return initialized_;
}