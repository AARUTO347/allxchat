#pragma once

#include "AARUESP.h"
#include <WiFi.h>

/**
 * @brief WiFi Connection Manager Module
 * Handles WiFi connection, reconnection, and status monitoring
 */
class WiFiModule : public aru::Module {
public:
    /**
     * @brief Create a WiFi module
     * @param ssid WiFi network SSID
     * @param password WiFi password
     */
    WiFiModule(const char* ssid, const char* password);

    /**
     * @brief Initialize and connect to WiFi
     * @return true if connected
     */
    bool init() override;

    /**
     * @brief Update WiFi status (reconnects if needed)
     */
    void update() override;

    /**
     * @brief Check if WiFi is connected
     * @return true if connected
     */
    bool isConnected();

    /**
     * @brief Get signal strength (RSSI)
     * @return RSSI in dBm
     */
    int getRSSI();

    /**
     * @brief Get local IP address
     * @return IP address string
     */
    String getLocalIP();

    /**
     * @brief Get MAC address
     * @return MAC address string
     */
    String getMAC();

    /**
     * @brief Disconnect from WiFi
     */
    void disconnect();

    /**
     * @brief Get module type identifier
     * @return "communication.wifi"
     */
    const std::string& getType() const override { return type_; }

    /**
     * @brief Check if module is healthy (connected)
     * @return true if connected
     */
    bool isHealthy() const override;

private:
    const char* ssid_;
    const char* password_;
    unsigned long lastCheck_{0};
    static constexpr unsigned long CHECK_INTERVAL_{5000};
    std::string type_ = "communication.wifi";
};