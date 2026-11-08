#pragma once

#include "AARUESP.h"

/**
 * @brief Potentiometer / Analog Input Module
 * Reads analog voltage and maps it to a user-configurable range.
 */
class PotentiometerModule : public aru::Module {
public:
    /**
     * @brief Create a potentiometer module
     * @param analogPin ADC pin connected to the wiper
     */
    PotentiometerModule(uint8_t analogPin);

    /**
     * @brief Initialize the ADC pin
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Update the analog reading
     */
    void update() override;

    /**
     * @brief Get raw ADC value (0-4095)
     * @return ADC reading
     */
    int getRawValue();

    /**
     * @brief Get percentage position (0-100)
     * @return Percent position of the dial
     */
    int getPercent();

    /**
     * @brief Get module type identifier
     * @return "input.potentiometer"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    uint8_t analogPin_;
    int rawValue_{0};
    unsigned long lastRead_{0};
    static constexpr unsigned long READ_INTERVAL_{50};
    std::string type_ = "input.potentiometer";
};