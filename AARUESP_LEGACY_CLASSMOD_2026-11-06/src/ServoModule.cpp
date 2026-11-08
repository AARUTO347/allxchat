#include "ServoModule.h"

// In a real implementation with Arduino ESP32/ESP8266:
// #include <ESP32Servo.h> or <Servo.h>
// For AARUESP framework, we provide the structure

ServoModule::ServoModule(uint8_t gpioPin) : gpioPin_(gpioPin) {}

bool ServoModule::init() {
    // Arduino ESP32/ESP8266 would use:
    // servo_.setPeriodHertz(50); // 50Hz for servos
    // servo_.attach(gpioPin_, 1000, 2000); // min_us, max_us
    // servo_.write(90); // Start at 90 degrees
    
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[Servo] Module initialized on GPIO " + String(gpioPin_));
    return true;
}

void ServoModule::setAngle(int angle) {
    // Clamp to 0-180 range
    if (angle < 0) angle = 0;
    if (angle > 180) angle = 180;
    
    angle_ = angle;
    // In real impl: servo_.write(angle_);
    
    AARUESP_DEBUG_PRINT("[Servo] GPIO " + String(gpioPin_) + " set to ");
    AARUESP_DEBUG_PRINTLN(angle_);
}

int ServoModule::getAngle() const {
    return angle_;
}

void ServoModule::setPercent(float percent) {
    // Convert 0-100% to 0-180 degrees
    int angle = (int)(180.0 * (percent / 100.0));
    setAngle(angle);
}

void ServoModule::startSweep(uint16_t speed_ms) {
    sweepSpeed_ = speed_ms;
    sweeping_ = true;
    sweepDirection_ = 1;
    lastMove_ = millis();
    AARUESP_DEBUG_PRINTLN("[Servo] Started sweep on GPIO " + String(gpioPin_));
}

void ServoModule::stopSweep() {
    sweeping_ = false;
    AARUESP_DEBUG_PRINTLN("[Servo] Stopped sweep on GPIO " + String(gpioPin_));
}

void ServoModule::update() {
    if (!sweeping_) return;
    if (millis() - lastMove_ < sweepSpeed_) return;

    lastMove_ = millis();
    int next = getAngle() + sweepDirection_;
    if (next >= 180) { next = 180; sweepDirection_ = -1; }
    else if (next <= 0) { next = 0; sweepDirection_ = 1; }
    setAngle(next);
}

bool ServoModule::isHealthy() const {
    return initialized_;
}