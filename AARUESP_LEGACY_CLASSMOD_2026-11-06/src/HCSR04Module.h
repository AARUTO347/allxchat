#pragma once

#include "AARUESP.h"

/**
 * @brief HC-SR04 Ultrasonic Distance Sensor Module
 * Measures distance using sound waves (2cm-400cm range)
 */
class HCSR04Module : public aru::Module {
public:
    HCSR04Module(uint8_t trigPin, uint8_t echoPin);

    /**
     * @brief Initialize the ultrasonic sensor
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Update distance reading
     */
    void update() override;

    /**
     * @brief Get distance in centimeters
     * @return Distance in cm (returns -1 if out of range)
     */
    float getDistanceCM();

    /**
     * @brief Get distance in inches
     * @return Distance in inches
     */
    float getDistanceInch();

    /**
     * @brief Get module type identifier
     * @return "sensor.hcsr04"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    uint8_t trigPin_;
    uint8_t echoPin_;
    float distanceCm_{0};
    unsigned long lastRead_{0};
    static constexpr unsigned long READ_INTERVAL_{60}; // HC-SR04 needs ~60ms cycle time
    std::string type_ = "sensor.hcsr04";
};