#pragma once

#include "AARUESP.h"
#include <Wire.h>

/**
 * @brief MPU6050 6-Axis IMU (Accel + Gyro)
 * I2C Interface: default address 0x68
 */
class MPU6050Module : public aru::Module {
public:
    MPU6050Module(uint8_t sda = 21, uint8_t scl = 22, uint8_t addr = 0x68);

    /**
     * @brief Initialize the IMU (wakes it, reads WHO_AM_I)
     * @return true if the device acknowledged
     */
    bool init() override;

    /**
     * @brief Update accelerometer/gyro readings
     */
    void update() override;

    /**
     * @brief Get acceleration (m/s²) on each axis
     */
    void getAcceleration(float& ax, float& ay, float& az);

    /**
     * @brief Get angular velocity (deg/s) on each axis
     */
    void getGyro(float& gx, float& gy, float& gz);

    /**
     * @brief Get die temperature (C)
     */
    float getTemperature();

    /**
     * @brief Get module type identifier
     * @return "sensor.mpu6050"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy (responding to I2C)
     * @return true if healthy
     */
    bool isHealthy() const override;

private:
    void writeRegister(uint8_t reg, uint8_t value);
    uint8_t readRegister(uint8_t reg);
    void readBurst(uint8_t startReg, uint8_t* data, uint8_t len);

    uint8_t sda_;
    uint8_t scl_;
    uint8_t addr_;
    uint8_t whoAmy_{0};
    std::string type_ = "sensor.mpu6050";
    float accel_x_{0}, accel_y_{0}, accel_z_{0};
    float gyro_x_{0}, gyro_y_{0}, gyro_z_{0};
    float temperature_{0};
    unsigned long lastRead_{0};
    static constexpr unsigned long READ_INTERVAL_{100};
};