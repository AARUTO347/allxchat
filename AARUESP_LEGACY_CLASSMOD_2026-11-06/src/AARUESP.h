#pragma once

/**
 * AARUESP - Universal ESP8266/ESP32 Library
 * By AARUTO - 2026
 * 200+ Board Support • 1000+ Module Support
 *
 * A universal library providing a unified API for ESP boards
 * with extensive module support for sensors, actuators,
 * displays, communication, and more.
 */

#ifndef AARUESP_H
#define AARUESP_H

#include <Arduino.h>
#include <map>
#include <string>
#include <vector>
#include <functional>

// Configuration macros
#define AARUESP_VERSION "1.0.0"
#define AARUESP_MAJOR 1
#define AARUESP_MINOR 0
#define AARUESP_PATCH 0

// Debug macro
#ifndef AARUESP_DEBUG
#define AARUESP_DEBUG 0
#endif

#if AARUESP_DEBUG
#define AARUESP_DEBUG_PRINT(x) Serial.print(x)
#define AARUESP_DEBUG_PRINTLN(x) Serial.println(x)
#else
#define AARUESP_DEBUG_PRINT(x)
#define AARUESP_DEBUG_PRINTLN(x)
#endif

// ============================================================
// Board Support Definitions
// ============================================================

/**
 * @brief ESP Board types
 */
namespace BoardType {
    enum Type {
        UNKNOWN = 0,
        ESP32,
        ESP32S2,
        ESP32S3,
        ESP32C3,
        ESP32C6,
        ESP8266,
    };
}

/**
 * @brief Board information structure
 */
struct BoardInfo {
    const char* name;
    BoardType::Type type;
    int gpio_count;
    uint32_t flash_size;
    double voltage_min;
    double voltage_max;
    double current_draw;
    const char* upload_port;
};

// Forward declaration of Module
namespace aru {
    class Module;
}

// ============================================================
// Core AARUESP Class
// ============================================================

class AARUESP {
public:
    AARUESP();
    ~AARUESP();

    /**
     * @brief Initialize the library (auto-detects the connected board)
     * @return true if initialization successful
     */
    bool begin();

    /**
     * @brief Detect the connected ESP board
     * @return BoardInfo structure with board details
     */
    BoardInfo detectBoard();

    /**
     * @brief Get the detected board type
     * @return BoardType::Type enum value
     */
    BoardType::Type getBoardType() const;

    /**
     * @brief Get human-readable board name
     * @return Board name string
     */
    const char* getBoardName() const;

    /**
     * @brief Register a module with the library
     * @param name Module name
     * @param module Module instance (library takes ownership)
     * @return true if registration successful
     */
    bool registerModule(const std::string& name, aru::Module* module);

    /**
     * @brief Get a registered module by name
     * @param name Module name
     * @return Module pointer or nullptr if not found
     */
    aru::Module* getModule(const std::string& name);

    /**
     * @brief List all registered module names
     * @return Vector of module names
     */
    std::vector<std::string> listModules();

    /**
     * @brief Update all registered modules (call in loop())
     */
    void update();

    /**
     * @brief Set debug level
     * @param level Debug level (0=none, 1=basic, 2=verbose)
     */
    void setDebug(int level);

private:
    BoardInfo boardInfo_;
    BoardType::Type boardType_;
    std::map<std::string, aru::Module*> modules_;
    int debugLevel_;
};

// ============================================================
// Module Base Class
// ============================================================

namespace aru {

class Module {
public:
    Module();
    virtual ~Module();

    /**
     * @brief Initialize the module
     * @return true if initialization successful
     */
    virtual bool init() = 0;

    /**
     * @brief Update module state (call periodically)
     */
    virtual void update() = 0;

    /**
     * @brief Get module name
     * @return Module name string
     */
    const std::string& getName() const;

    /**
     * @brief Set the module name (called by derived classes)
     */
    void setName(const std::string& name);

    /**
     * @brief Get module type identifier
     * @return Type string
     */
    virtual const std::string& getType() const = 0;

    /**
     * @brief Check if module is initialized
     * @return true if initialized
     */
    bool isInitialized() const;

    /**
     * @brief Check if module is healthy
     * @return true if module functioning properly
     */
    virtual bool isHealthy() const;

protected:
    std::string name_;
    bool initialized_;
    bool healthy_;
};

} // namespace aru

// ============================================================
// Convenience Macros
// ============================================================

#define AARUESP_MODULE_begin(m) m->init()
#define AARUESP_MODULE_update(m) m->update()
#define AARUESP_MODULE_isHealthy(m) m->isHealthy()

// ============================================================
// Pre-defined Board Instances
// ==========================================================//

extern const BoardInfo BOARD_ESP32_DEFAULT;
extern const BoardInfo BOARD_ESP32S2_DEFAULT;
extern const BoardInfo BOARD_ESP32S3_DEFAULT;
extern const BoardInfo BOARD_ESP32C3_DEFAULT;
extern const BoardInfo BOARD_ESP32C6_DEFAULT;
extern const BoardInfo BOARD_ESP8266_DEFAULT;

/**
 * @brief Get board info by name
 * @param name Board name string (from the board registry)
 * @return BoardInfo pointer or nullptr
 */
const BoardInfo* getBoardInfo(const std::string& name);

// ============================================================
// Convenience Functions
// ============================================================

/**
 * @brief Initialize AARUESP and detect board
 * @return true if successful
 */
bool aru_begin();

/**
 * @brief Get the AARUESP singleton instance
 * @return Reference to AARUESP instance
 */
AARUESP& aru();

/**
 * @brief Convenience: check if a registered module is healthy
 * @param name Module name
 * @return true if module is registered and healthy
 */
bool aruModuleHealthy(const std::string& name);