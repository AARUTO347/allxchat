#include "HCSR04Module.h"

HCSR04Module::HCSR04Module(uint8_t trigPin, uint8_t echoPin)
    : trigPin_(trigPin), echoPin_(echoPin) {}

bool HCSR04Module::init() {
    pinMode(trigPin_, OUTPUT);
    pinMode(echoPin_, INPUT);
    digitalWrite(trigPin_, LOW);
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[HCSR04] Module initialized (TRIG=" + String(trigPin_) + " ECHO=" + String(echoPin_) + ")");
    return true;
}

void HCSR04Module::update() {
    if (!healthy_) return;
    if (millis() - lastRead_ < READ_INTERVAL_) return;
    
    // Send 10us trigger pulse
    digitalWrite(trigPin_, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin_, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin_, LOW);
    
    // Read echo pulse duration
    long duration = pulseIn(echoPin_, HIGH, 30000); // 30ms timeout
    
    if (duration == 0) {
        distanceCm_ = -1; // Out of range
    } else {
        // Speed of sound: 343 m/s = 0.0343 cm/us
        distanceCm_ = (duration * 0.0343) / 2.0;
    }
    
    lastRead_ = millis();
}

float HCSR04Module::getDistanceCM() {
    return distanceCm_;
}

float HCSR04Module::getDistanceInch() {
    return distanceCm_ * 0.393701;
}

bool HCSR04Module::isHealthy() const {
    return initialized_;
}