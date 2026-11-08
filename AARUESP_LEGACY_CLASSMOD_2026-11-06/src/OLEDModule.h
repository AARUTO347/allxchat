#pragma once

#include "AARUESP.h"
#include <Wire.h>

/**
 * @brief OLED Display Module (SSD1306 I2C, 128x64)
 * Minimal self-contained driver - no external graphics library required.
 * For text only. For graphics use Adafruit_SSD1306 directly.
 */
class OLEDModule : public aru::Module {
public:
    OLEDModule(uint8_t sda = 21, uint8_t scl = 22, uint8_t addr = 0x3C);

    /**
     * @brief Initialize the SSD1306 display
     * @return true if the display acknowledged on I2C
     */
    bool init() override;

    /**
     * @brief Update display (refreshes buffer -> panel if dirty)
     */
    void update() override;

    /**
     * @brief Clear the internal buffer
     */
    void clear();

    /**
     * @brief Print text at a character position (x, y in pixels)
     * @param x X position in pixels (0-127)
     * @param y Y position in pixels (0-63)
     * @param text Null-terminated string
     * @param size Text size multiplier (1-3)
     */
    void print(int x, int y, const char* text, int size = 1);

    /**
     * @brief Print a string to the display at position (x, y)
     * @param x X position
     * @param y Y position
     * @param text Text to print
     * @param size Text size
     */
    void printP(int x, int y, const char* text, int size = 1);

    /**
     * @brief Push the internal buffer to the display
     */
    void display();

    /**
     * @brief Get module type identifier
     * @return "display.oled"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if display is healthy
     * @return true if healthy
     */
    bool isHealthy() const override;

    /**
     * @brief Print a formatted line at a given row
     * @param line Line number (0-7 for 8-line 128x64 display)
     * @param format printf-style format string
     * @param ... Format arguments
     */
    void println(int line, const char* format, ...);

private:
    void writeCommand(uint8_t cmd);
    void writeData(uint8_t data);
    void setCursor(int x, int y);
    void drawChar(char c, int x, int y, int size);
    void beginTransmission(uint8_t ctrl);

    uint8_t sda_;
    uint8_t scl_;
    uint8_t addr_;
    uint8_t buffer_[1024]; // 128 x 64 / 8 = 1024 bytes
    int cursorX_{0};
    int cursorY_{0};
    bool dirty_{false};
    std::string type_ = "display.oled";
    uint8_t brightness_{0x7F};
};