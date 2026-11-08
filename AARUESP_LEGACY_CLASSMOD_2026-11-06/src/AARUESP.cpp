#include "AARUESP.h"
#include <ESP.h>
#include "boards/BoardRegistry.h"
#include <string.h>

// ==========================================================//
// Board detection helpers
// ==========================================================//

static BoardType::Type aruDetectBoardType() {
#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
    float chipRev = ESP.getChipRevision();
    if (chipRev >= 2.0f) return BoardType::ESP32S3;
    if (chipRev >= 1.0f) return BoardType::ESP32S2;
    return BoardType::ESP32;
#elif defined(ESP8266)
    return BoardType::ESP8266;
#else
    return BoardType::UNKNOWN;
#endif
}

static uint32_t aruDetectFlashSize() {
#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
    return ESP.getFlashChipSize();
#else
    // ESP8266: not reliably exposed in all cores; assume 4MB default
    return 4L*1024*1024;
#endif
}

// ==========================================================//
// AARUESP Implementation
// ==========================================================//

AARUESP::AARUESP()
    : boardInfo_{ nullptr, BoardType::UNKNOWN, 0, 0, 0.0, 0.0, 0.0, nullptr },
      boardType_(BoardType::UNKNOWN),
      debugLevel_(AARUESP_DEBUG) {}

AARUESP::~AARUESP() {
    for (auto& pair : modules_) {
        delete pair.second;
    }
    modules_.clear();
}

bool AARUESP::begin() {
    AARUESP_DEBUG_PRINTLN("[AARUESP] Initializing AARUESP Library v" AARUESP_VERSION);

    boardInfo_ = detectBoard();
    boardType_ = getBoardType();

    AARUESP_DEBUG_PRINT("[AARUESP] Detected board: ");
    AARUESP_DEBUG_PRINTLN(boardInfo_.name ? boardInfo_.name : "Unknown");

    // Initialize all registered modules
    for (auto& pair : modules_) {
        if (pair.second) {
            pair.second->init();
        }
    }

    return true;
}

BoardInfo AARUESP::detectBoard() {
    BoardInfo info = { nullptr, BoardType::UNKNOWN, 0, 0, 0.0, 0.0, 0.0, nullptr };

#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
    info.name = "ESP32";
    BoardType::Type type = aruDetectBoardType();
    info.type = type;
    info.gpio_count = (type == BoardType::ESP32S3) ? 45 : 34;
    info.flash_size = aruDetectFlashSize();
    info.voltage_min = 3.0;
    info.voltage_max = 3.6;
    info.current_draw = 0.1;
    info.upload_port = "/dev/ttyUSB0";

    // Try to match a specific board from the registry by generic name
    const char* genericName = (type == BoardType::ESP32S3) ? "ARU_ESP32S3_GENERIC" :
                              (type == BoardType::ESP32S2) ? "ARU_ESP32S2_GENERIC" :
                              "ARU_ESP32_GENERIC";
    const BoardInfo* found = aruFindBoard(genericName);
    if (found) {
        BoardInfo copy = *found;
        copy.flash_size = aruDetectFlashSize(); // prefer detected flash
        return copy;
    }

#elif defined(ESP8266)
    info.name = "ESP8266";
    info.type = BoardType::ESP8266;
    info.gpio_count = 17;
    info.flash_size = aruDetectFlashSize();
    info.voltage_min = 2.5;
    info.voltage_max = 3.6;
    info.current_draw = 0.1;
    info.upload_port = "/dev/ttyUSB0";

    const BoardInfo* found = aruFindBoard("ARU_ESP8266_GENERIC");
    if (found) {
        BoardInfo copy = *found;
        copy.flash_size = aruDetectFlashSize();
        return copy;
    }
#else
    info.name = "Unknown ESP";
    info.type = BoardType::UNKNOWN;
#endif

    return info;
}

BoardType::Type AARUESP::getBoardType() const {
    return boardType_;
}

const char* AARUESP::getBoardName() const {
    return boardInfo_.name;
}

bool AARUESP::registerModule(const std::string& name, aru::Module* module) {
    if (modules_.find(name) != modules_.end()) {
        AARUESP_DEBUG_PRINTLN("[AARUESP] Module already registered: " + name);
        return false;
    }
    modules_[name] = module;
    AARUESP_DEBUG_PRINTLN("[AARUESP] Registered module: " + name);
    return true;
}

aru::Module* AARUESP::getModule(const std::string& name) {
    auto it = modules_.find(name);
    if (it != modules_.end()) {
        return it->second;
    }
    return nullptr;
}

std::vector<std::string> AARUESP::listModules() {
    std::vector<std::string> names;
    for (auto& pair : modules_) {
        names.push_back(pair.first);
    }
    return names;
}

void AARUESP::update() {
    for (auto& pair : modules_) {
        if (pair.second && pair.second->isInitialized()) {
            pair.second->update();
        }
    }
}

void AARUESP::setDebug(int level) {
    debugLevel_ = level;
}

// ==========================================================//
// Module Implementation
// ==========================================================//

namespace aru {

Module::Module() : initialized_(false), healthy_(false) {}

Module::~Module() = default;

const std::string& Module::getName() const {
    return name_;
}

void Module::setName(const std::string& name) {
    name_ = name;
}

bool Module::isInitialized() const {
    return initialized_;
}

bool Module::isHealthy() const {
    return healthy_;
}

} // namespace aru

// ==========================================================//
// Pre-defined Board Instances (defaults)
// ==========================================================//

const BoardInfo BOARD_ESP32_DEFAULT  = { "ESP32 DevKit V1", BoardType::ESP32, 34, 4L*1024*1024, 3.0, 3.6, 0.10, "COM3" };
const BoardInfo BOARD_ESP32S2_DEFAULT = { "ESP32-S2 DevKit", BoardType::ESP32S2, 26, 8L*1024*1024, 3.0, 3.6, 0.10, "COM3" };
const BoardInfo BOARD_ESP32S3_DEFAULT = { "ESP32-S3 DevKit", BoardType::ESP32S3, 45, 16L*1024*1024, 3.0, 3.6, 0.12, "COM3" };
const BoardInfo BOARD_ESP32C3_DEFAULT = { "ESP32-C3 DevKit", BoardType::ESP32C3, 21, 4L*1024*1024, 3.0, 3.6, 0.08, "COM3" };
const BoardInfo BOARD_ESP32C6_DEFAULT = { "ESP32-C6 DevKit", BoardType::ESP32C6, 30, 16L*1024*1024, 3.0, 3.6, 0.10, "COM3" };
const BoardInfo BOARD_ESP8266_DEFAULT = { "NodeMCU v2.0", BoardType::ESP8266, 17, 4L*1024*1024, 2.5, 3.6, 0.10, "COM3" };

// ==========================================================//
// getBoardInfo + convenience functions
// ==========================================================//

const BoardInfo* getBoardInfo(const std::string& name) {
    return aruFindBoard(name.c_str());
}

AARUESP& aru() {
    static AARUESP instance;
    return instance;
}

bool aru_begin() {
    return aru().begin();
}

bool aruModuleHealthy(const std::string& name) {
    aru::Module* mod = aru().getModule(name);
    if (mod) {
        return mod->isHealthy();
    }
    return false;
}