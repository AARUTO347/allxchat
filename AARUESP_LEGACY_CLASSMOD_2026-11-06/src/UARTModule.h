#pragma once

#include "AARUESP.h"

/**
 * @brief UART Pass-Through Module
 * Provides a convenient interface for reading/writing over UART.
 * Useful for communicating with GPS modules, sensors, or other devices.
 */
class UARTModule : public aru::Module {
public:
    /**
     * @brief Create a UART module instance
     * @param rxPin GPIO pin for receiving data
     * @param txPin GPIO pin for transmitting data
     * @param baud Baud rate for serial communication
     */
    UARTModule(int rxPin, int txPin, long baud = 9600);

    /**
     * @brief Initialize the UART port
     * @return true if successful
     */
    bool init() override;

    /**
     * @brief Update module state (no-op; UART is synchronous)
     */
    void update() override;

    /**
     * @brief Write data to UART
     * @param data Pointer to data byte(s)
     * @param length Number of bytes to write
     */
    size_t write(uint8_t* data, size_t length);

    /**
     * @brief Write a string to UART
     * @param str Null-terminated string
     * @return Number of bytes written
     */
    size_t write(const char* str);

    /**
     * @brief Write a single byte to UART
     * @param byte Data byte
     * @return 1 if successful
     */
    size_t write(uint8_t byte);

    /**
     * @brief Read data from UART (non-blocking, returns available bytes)
     * @param buffer Buffer to store received data
     * @param maxLen Maximum bytes to read
     * @return Number of bytes read
     */
    size_t read(uint8_t* buffer, size_t maxLen);

    /**
     * @brief Read a available byte (returns -1 if no data)
     * @return byte value or -1 if no data available
     */
    int read();

    /**
     * @brief Get number of bytes available to read
     * @return Available byte count
     */
    size_t available();

    /**
     * @brief Get module type identifier
     * @return "communication.uart"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy (UART port accessible)
     * @return true if healthy
     */
    bool isHealthy() const override;

    /**
     * @brief Print formatted data to UART
     * @param format printf-style format string
     * @param ... Format arguments
     */
    void print(const char* format, ...);

    /**
     * @println Println formatted data to UART
     * @param format printf-style format string
     * @param ... Format arguments
     */
    void println(const char* format, ...);

private:
    int rxPin_;
    int txPin_;
    long baud_;
    HardwareSerial* uartPort_;
    uint8_t readBuffer_[64];
    size_t readPos_{0};
    size_t readAvailable_{0};
    std::string type_ = "communication.uart";
};