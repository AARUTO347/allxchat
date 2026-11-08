#include "MPU6050Module.h"

// MPU6050 registers
#define MPU6050_WHO_AM_I 0x75
#define MPU6050_PWR_MGMT_1 0x6B
#define MPU6050_ACCEL_XOUT_H 0x3B
#define MPU6050_TEMP_OUT_H 0x41
#define MPU6050_GYRO_XOUT_H 0x43

MPU6050Module::MPU6050Module(uint8_t sda, uint8_t scl, uint8_t addr)
    : sda_(sda), scl_(scl), addr_(addr) {}

bool MPU6050Module::init() {
    Wire.begin(sda_, scl_);

    // Wake the device (clear sleep bit)
    writeRegister(MPU6050_PWR_MGMT_1, 0x00);
    delay(10);

    // Read WHO_AM_I (expected 0x68)
    whoAmy_ = readRegister(MPU6050_WHO_AM_I);
    if (whoAmy_ != 0x68 && whoAmy_ != 0x70) {
        AARUESP_DEBUG_PRINTLN("[MPU6050] Sensor not found at 0x" + String(addr_, HEX));
        initialized_ = false;
        healthy_ = false;
        return false;
    }

    initialized_ = true;
    healthy_ = true;
    lastRead_ = 0; // Force immediate read

    AARUESP_DEBUG_PRINTLN("[MPU6050] Sensor initialized (WHO_AM_I=0x" + String(whoAmy_, HEX) + ")");
    return true;
}

void MPU6050Module::update() {
    if (!healthy_) return;
    if (millis() - lastRead_ < READ_INTERVAL_) return;

    uint8_t buf[14] = {0};
    readBurst(MPU6050_ACCEL_XOUT_H, buf, 14);

    int16_t ax = (int16_t)((buf[0] << 8) | buf[1]);
    int16_t ay = (int16_t)((buf[2] << 8) | buf[3]);
    int16_t az = (int16_t)((buf[4] << 8) | buf[5]);
    int16_t temp = (int16_t)((buf[6] << 8) | buf[7]);
    int16_t gx = (int16_t)((buf[8] << 8) | buf[9]);
    int16_t gy = (int16_t)((buf[10] << 8) | buf[11]);
    int16_t gz = (int16_t)((buf[12] << 8) | buf[13]);

    // Convert: accel ±2g (16384 LSB/g) -> m/s², gyro ±250 dps (131 LSB/dps)
    const float accelScale = 9.80665 / 16384.0f;
    const float gyroScale = 1.0f / 131.0f;

    accel_x_ = ax * accelScale;
    accel_y_ = ay * accelScale;
    accel_z_ = az * accelScale;

    temperature_ = (temp / 340.0f) + 36.53f; // Datasheet formula

    gyro_x_ = gx * gyroScale;
    gyro_y_ = gy * gyroScale;
    gyro_z_ = gz * gyroScale;

    lastRead_ = millis();
}

void MPU6050Module::getAcceleration(float& ax, float& ay, float& az) {
    ax = accel_x_; ay = accel_y_; az = accel_z_;
}

void MPU6050Module::getGyro(float& gx, float& gy, float& gz) {
    gx = gyro_x_; gy = gyro_y_; gz = gyro_z_;
}

float MPU6050Module::getTemperature() {
    return temperature_;
}

void MPU6050Module::writeRegister(uint8_t reg, uint8_t value) {
    Wire.beginTransmission(addr_);
    Wire.write(reg);
    Wire.write(value);
    Wire.endTransmission();
}

uint8_t MPU6050Module::readRegister(uint8_t reg) {
    Wire.beginTransmission(addr_);
    Wire.write(reg);
    Wire.endTransmission(false);
    Wire.requestFrom(addr_, (uint8_t)1);
    return Wire.available() ? Wire.read() : 0;
}

void MPU6050Module::readBurst(uint8_t startReg, uint8_t* data, uint8_t len) {
    Wire.beginTransmission(addr_);
    Wire.write(startReg);
    Wire.endTransmission(false);
    Wire.requestFrom(addr_, len);
    for (uint8_t i = 0; i < len && Wire.available(); i++) {
        data[i] = Wire.read();
    }
}

bool MPU6050Module::isHealthy() const {
    return initialized_ && healthy_;
}