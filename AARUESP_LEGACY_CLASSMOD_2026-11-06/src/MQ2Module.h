#pragma once

#include "AARUESP.h"

/**
 * @brief MQ-2 Gas Sensor Module
 * Analog MQ-2 combustible gas/smoke sensor
 */
class MQ2Module : public aru::Module {
public:
    MQ2Module(uint8_t analogPin, uint8_t digitalPin = 255);

    /**
     * @brief Initialize the MQ-2 sensor
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Update reading
     */
    void update() override;

    /**
     * @brief Get raw ADC value
     * @return ADC reading (0-4095)
     */
    int getRawValue();

    /**
     * @brief Get gas concentration estimate in ppm (rough estimate)
     * @return ppm value
     */
    float getGasPPM();

    /**
     * @brief Get smoke detection state (from digital pin)
     * @return true if smoke detected
     */
    bool isSmokeDetected();

    /**
     * @brief Get module type identifier
     * @return "sensor.mq2"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    uint8_t analogPin_;
    uint8_t digitalPin_;
    int rawValue_{0};
    bool smokeDetected_{false};
    unsigned long lastRead_{0};
    static constexpr unsigned long READ_INTERVAL_{1000};
    static constexpr float RO_VALUE_{10.0}; // Clean air resistance (kΩ)
    std::string type_ = "sensor.mq2";
};