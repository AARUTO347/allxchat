#pragma once

#include "AARUESP.h"
#include <Wire.h>

/**
 * @brief BME280 Temperature/Humidity/Pressure Sensor Module
 * I2C Interface: SDA, SCL
 *
 * Self-contained implementation (no external Adafruit dependency).
 * Uses direct I2C transactions with the Bosch BME280 register map.
 */
class BME280Module : public aru::Module {
public:
    BME280Module(uint8_t sda = 21, uint8_t scl = 22, uint8_t addr = 0x76);

    /**
     * @brief Initialize the BME280 sensor and read calibration data
     * @return true if a valid chip-ID is found
     */
    bool init() override;

    /**
     * @brief Update sensor readings (temperature, humidity, pressure)
     */
    void update() override;

    /**
     * @brief Get temperature in Celsius
     * @return Temperature °C
     */
    float getTemperature();

    /**
     * @brief Get humidity in %
     * @return Humidity %
     */
    float getHumidity();

    /**
     * @brief Get pressure in hPa
     * @return Pressure hPa
     */
    float getPressure();

    /**
     * @brief Get module type identifier
     * @return "sensor.bme280"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if sensor is healthy (valid recent reading)
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    void readChipID();
    void writeRegister(uint8_t reg, uint8_t value);
    uint8_t readRegister(uint8_t reg);

    uint8_t sda_;
    uint8_t scl_;
    uint8_t addr_;
    uint8_t chipId_{0};
    bool sensorPresent_{false};
    std::string type_ = "sensor.bme280";
    float temperature_{0};
    float humidity_{0};
    float pressure_{1013.25};
    unsigned long lastRead_{0};
    static constexpr unsigned long READ_INTERVAL_{2000}; // 2Hz max
};