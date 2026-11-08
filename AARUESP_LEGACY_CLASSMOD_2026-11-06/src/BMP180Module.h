#pragma once

#include "AARUESP.h"

/**
 * @brief BMP180 Pressure/Temperature Sensor Module
 * I2C interface for Bosch BMP180 high-precision sensor
 */
class BMP180Module : public aru::Module {
public:
    BMP180Module(uint8_t sda = 21, uint8_t scl = 22);

    /**
     * @brief Initialize the BMP180 sensor
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Update sensor reading
     */
    void update() override;

    /**
     * @brief Get temperature in Celsius
     * @return Temperature °C
     */
    float getTemperature();

    /**
     * @brief Get pressure in hPa
     * @return Pressure hPa
     */
    float getPressure();

    /**
     * @brief Get module type identifier
     * @return "sensor.bmp180"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    // BMP180 would use Adafruit_BMP_Unified or similar
    // For AARUESP framework, providing the structure
    float temperature_{0};
    float pressure_{1013.25};
    unsigned long lastRead_{0};
    static constexpr unsigned long READ_INTERVAL_{5000}; // 0.2Hz max
    std::string type_ = "sensor.bmp180";
};