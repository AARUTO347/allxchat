#pragma once

#include "AARUESP.h"
#include <Wire.h>

/**
 * @brief BH1750 Digital Light Sensor (I2C)
 * Returns illuminance in lux
 */
class BH1750Module : public aru::Module {
public:
    BH1750Module(uint8_t sda = 21, uint8_t scl = 22, uint8_t addr = 0x23);

    /**
     * @brief Initialize the BH1750 in continuous H-res mode
     * @return true if the device acknowledged on I2C
     */
    bool init() override;

    /**
     * @brief Update light reading
     */
    void update() override;

    /**
     * @brief Get illuminance in lux
     * @return Lux value
     */
    float getLux();

    /**
     * @brief Get module type identifier
     * @return "sensor.bh1750"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    uint8_t sda_;
    uint8_t scl_;
    uint8_t addr_;
    std::string type_ = "sensor.bh1750";
    float lux_{0};
    unsigned long lastRead_{0};
    static constexpr unsigned long READ_INTERVAL_{1000};
};