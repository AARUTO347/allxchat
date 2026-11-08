#pragma once

#include "AARUESP.h"

/**
 * @brief Soil Moisture Sensor Module
 * Analog or digital soil moisture detection
 */
class SoilMoistureModule : public aru::Module {
public:
    /**
     * @brief Create a soil moisture module
     * @param analogPin ADC pin connected to moisture sensor
     * @param dryValue ADC value in air (calibration)
     * @param wetValue ADC value in water (calibration)
     */
    SoilMoistureModule(uint8_t analogPin, int dryValue = 4095, int wetValue = 0);

    /**
     * @brief Initialize the moisture sensor pin
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Update moisture reading
     */
    void update() override;

    /**
     * @brief Get moisture percentage (0-100)
     * @return Moisture % (0=completely dry, 100=completely wet)
     */
    int getMoisture();

    /**
     * @brief Get raw ADC value
     * @return ADC reading (0-4095 for 12-bit ESP ADCs)
     */
    int getRawValue();

    /**
     * @brief Get module type identifier
     * @return "sensor.soilmoisture"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    uint8_t analogPin_;
    int dryValue_;
    int wetValue_;
    int rawValue_{0};
    int moisture_{0};
    unsigned long lastRead_{0};
    static constexpr unsigned long READ_INTERVAL_{1000};
    std::string type_ = "sensor.soilmoisture";
};