#pragma once

#include "AARUESP.h"

/**
 * @brief ACS712 Analog Current Sensor Module
 * Supports 5A, 20A, 30A variants (sensitivity: 185/100/66 mV per A)
 */
class ACS712Module : public aru::Module {
public:
    enum class ACS712Type { ACS712_5A = 0, ACS712_20A = 1, ACS712_30A = 2 };

    /**
     * @brief Create an ACS712 module instance
     * @param analogPin ADC pin connected to ACS712 OUT
     * @param type Sensor variant (5A/20A/30A)
     * @param vRef Reference voltage (5.0 for most breakout boards)
     */
    ACS712Module(uint8_t analogPin, ACS712Type type = ACS712Type::ACS712_5A, float vRef = 5.0f);

    /**
     * @brief Initialize the sensor pin
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Update current reading
     */
    void update() override;

    /**
     * @brief Get current in Amps (absolute value)
     * @return Current in A
     */
    float getCurrent();

    /**
     * @brief Get raw ADC value
     * @return ADC reading (0-4095)
     */
    int getRawValue();

    /**
     * @brief Get module type identifier
     * @return "sensor.acs712"
     */
    const std::string& getType() const override { return typeStr_; }

    /**
     * @brief Check if module is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    float getSensitivity() const;

    uint8_t analogPin_;
    ACS712Type variant_;
    float vRef_;
    float current_{0};
    int rawValue_{0};
    unsigned long lastRead_{0};
    static constexpr unsigned long READ_INTERVAL_{500};
    std::string typeStr_ = "sensor.acs712";
};