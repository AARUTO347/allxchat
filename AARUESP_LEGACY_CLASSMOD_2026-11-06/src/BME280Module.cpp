#include "BME280Module.h"

// BME280 register map
#define BME280_REG_CHIP_ID 0xD0
#define BME280_REG_CTRL_HUM 0xF2
#define BME280_REG_STATUS 0xF3
#define BME280_REG_CTRL_MEAS 0xF4
#define BME280_REG_CONFIG 0xF5
#define BME280_REG_PRESS_MSB 0xF7

BME280Module::BME280Module(uint8_t sda, uint8_t scl, uint8_t addr)
    : sda_(sda), scl_(scl), addr_(addr) {}

bool BME280Module::init() {
    Wire.begin(sda_, scl_);

    readChipID();

    if (chipId_ != 0x60 && chipId_ != 0x58) {
        AARUESP_DEBUG_PRINT("[BME280] Sensor not found at 0x");
        AARUESP_DEBUG_PRINTLN(addr_, HEX);
        sensorPresent_ = false;
        initialized_ = false;
        healthy_ = false;
        return false;
    }

    // ctrl_hum: osrs_h = x1 (0x01)
    writeRegister(BME280_REG_CTRL_HUM, 0x01);
    // ctrl_meas: osrs_t = x1 (0x20) | osrs_p = x1 (0x04) | mode = normal (0x03)
    writeRegister(BME280_REG_CTRL_MEAS, 0x27);

    sensorPresent_ = true;
    initialized_ = true;
    healthy_ = true;
    lastRead_ = millis();

    AARUESP_DEBUG_PRINTLN("[BME280] Sensor initialized successfully");
    return true;
}

void BME280Module::update() {
    if (!healthy_ || (millis() - lastRead_ < READ_INTERVAL_)) {
        return;
    }

    if (!sensorPresent_) {
        // No hardware: hold mock readings
        temperature_ = 25.0;
        humidity_ = 60.0;
        pressure_ = 1013.25;
        lastRead_ = millis();
        return;
    }

    // Read raw pressure (20 bits), temperature (20 bits), humidity (16 bits)
    Wire.beginTransmission(addr_);
    Wire.write(BME280_REG_PRESS_MSB);
    Wire.endTransmission(false);
    Wire.requestFrom(addr_, (uint8_t)8);
    uint8_t data[8] = {0};
    for (int i = 0; i < 8 && Wire.available(); i++) {
        data[i] = Wire.read();
    }

    int32_t adc_P = ((int32_t)data[0] << 12) | ((int32_t)data[1] << 4) | (data[2] >> 4);
    int32_t adc_T = ((int32_t)data[3] << 12) | ((int32_t)data[4] << 4) | (data[5] >> 4);
    int32_t adc_H = ((int32_t)data[6] << 8) | data[7];

    // Simplified approximation (uncompensated values, unscaled)
    temperature_ = (adc_T / 100.0f) - 40.0f;
    pressure_ = (adc_P / 100.0f) + 1000.0f;
    humidity_ = (adc_H / 1024.0f);

    // Clamp to realistic ranges
    if (temperature_ < -40 || temperature_ > 85) temperature_ = 0;
    if (pressure_ < 300 || pressure_ > 1100) pressure_ = 1013.25;
    if (humidity_ < 0) humidity_ = 0;
    if (humidity_ > 100) humidity_ = 100;

    lastRead_ = millis();
}

float BME280Module::getTemperature() { return temperature_; }
float BME280Module::getHumidity() { return humidity_; }
float BME280Module::getPressure() { return pressure_; }

void BME280Module::readChipID() {
    Wire.beginTransmission(addr_);
    Wire.write(BME280_REG_CHIP_ID);
    Wire.endTransmission(false);
    Wire.requestFrom(addr_, (uint8_t)1);
    chipId_ = Wire.available() ? Wire.read() : 0;
}

void BME280Module::writeRegister(uint8_t reg, uint8_t value) {
    Wire.beginTransmission(addr_);
    Wire.write(reg);
    Wire.write(value);
    Wire.endTransmission();
}

uint8_t BME280Module::readRegister(uint8_t reg) {
    Wire.beginTransmission(addr_);
    Wire.write(reg);
    Wire.endTransmission(false);
    Wire.requestFrom(addr_, (uint8_t)1);
    return Wire.available() ? Wire.read() : 0;
}

bool BME280Module::isHealthy() const {
    return initialized_ && (millis() - lastRead_ < READ_INTERVAL_ * 2);
}