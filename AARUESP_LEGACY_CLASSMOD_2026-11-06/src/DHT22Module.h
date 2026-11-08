#pragma once

#include "AARUESP.h"

/**
 * @brief DHT22 Temperature/Humidity Sensor Module
 * Simple wrapper for DHT22 (AM2302) sensor
 */
class DHT22Module : public aru::Module {
public:
    /**
     * @brief Create a DHT22 module instance
     * @param gpioPin GPIO pin connected to DHT data pin
     */
    DHT22Module(uint8_t gpioPin);

    /**
     * @brief Initialize the DHT sensor
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Update sensor reading (reads temperature and humidity)
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
     * @brief Get module type identifier
     * @return "sensor.dht22"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy (valid recent reading)
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    uint8_t gpioPin_;
    float temperature_{0};
    float humidity_{0};
    unsigned long lastRead_{0};
    static constexpr unsigned long READ_INTERVAL_{2000}; // 2Hz for DHT22
    std::string type_ = "sensor.dht22";
};