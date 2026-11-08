#include "RGBLEDModule.h"

RGBLEDModule::RGBLEDModule(uint8_t rPin, uint8_t gpin, uint8_t bPin, bool commonCathode)
    : rPin_(rPin), gPin_(gpin), bPin_(bPin), commonCathode_(commonCathode) {}

bool RGBLEDModule::init() {
    pinMode(rPin_, OUTPUT);
    pinMode(gPin_, OUTPUT);
    pinMode(bPin_, OUTPUT);
    
    // Set all to off state initially
    setColor(0, 0, 0);
    
    initialized_ = true;
    healthy_ = true;
    AARUESP_DEBUG_PRINTLN("[RGBLED] Module initialized on R=" + String(rPin_) + " G=" + String(gPin_) + " B=" + String(bPin_));
    return true;
}

void RGBLEDModule::setColor(uint8_t r, uint8_t g, uint8_t b) {
    rValue_ = r;
    gValue_ = g;
    bValue_ = b;
    
    // Apply common cathode/anode logic
    int rOut = commonCathode_ ? r : 255 - r;
    int gOut = commonCathode_ ? g : 255 - g;
    int bOut = commonCathode_ ? b : 255 - b;
    
    analogWrite(rPin_, rOut);
    analogWrite(gPin_, gOut);
    analogWrite(bPin_, bOut);
    
    AARUESP_DEBUG_PRINT("[RGBLED] Color set to R=");
    AARUESP_DEBUG_PRINT(r);
    AARUESP_DEBUG_PRINT(" G=");
    AARUESP_DEBUG_PRINT(g);
    AARUESP_DEBUG_PRINT(" B=");
    AARUESP_DEBUG_PRINTLN(b);
}

void RGBLEDModule::getColor(uint8_t& r, uint8_t& g, uint8_t& b) {
    r = rValue_;
    g = gValue_;
    b = bValue_;
}

void RGBLEDModule::setColorHSV(float h, float s, float v) {
    // Simplified HSV to RGB conversion
    // Full implementation would use proper colorspace conversion
    int hi = (int)floor(h / 60) % 6;
    float f = h / 60 - floor(h / 6);
    float p = v * (1 - s / 100);
    float q = v * (1 - f * s / 100);
    float t = v * (1 - (1 - f) * s / 100);
    
    float r = 0, g = 0, b = 0;
    
    switch (hi) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    
    setColor(
        commonCathode_ ? (uint8_t)(255 * r) : (uint8_t)(255 * (1 - r)),
        commonCathode_ ? (uint8_t)(255 * g) : (uint8_t)(255 * (1 - g)),
        commonCathode_ ? (uint8_t)(255 * b) : (uint8_t)(255 * (1 - b))
    );
}

void RGBLEDModule::startCycle(uint16_t speed_ms) {
    cycleSpeed_ = speed_ms;
    cycling_ = true;
    lastChange_ = millis();
    AARUESP_DEBUG_PRINTLN("[RGBLED] Started color cycle");
}

void RGBLEDModule::stopCycle() {
    cycling_ = false;
    setColor(0, 0, 0); // Turn off
    AARUESP_DEBUG_PRINTLN("[RGBLED] Stopped color cycle");
}

void RGBLEDModule::update() {
    if (!cycling_) return;
    if (millis() - lastChange_ < cycleSpeed_) return;

    lastChange_ = millis();
    hue_ = (hue_ + 3) % 360;
    setColorHSV(hue_, 100, 100);
}

bool RGBLEDModule::isHealthy() const {
    return initialized_;
}