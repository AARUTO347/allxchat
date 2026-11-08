#include "WiFiModule.h"

WiFiModule::WiFiModule(const char* ssid, const char* password)
    : ssid_(ssid), password_(password) {}

bool WiFiModule::init() {
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid_, password_);
    
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && (millis() - start < 20000)) {
        delay(500);
        AARUESP_DEBUG_PRINT(".");
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        initialized_ = true;
        healthy_ = true;
        AARUESP_DEBUG_PRINTLN("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
        return true;
    }
    
    healthy_ = false;
    return false;
}

void WiFiModule::update() {
    if (millis() - lastCheck_ < CHECK_INTERVAL_) return;
    lastCheck_ = millis();
    
    if (WiFi.status() != WL_CONNECTED) {
        AARUESP_DEBUG_PRINTLN("[WiFi] Connection lost, reconnecting...");
        WiFi.reconnect();
    }
}

bool WiFiModule::isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

int WiFiModule::getRSSI() {
    return WiFi.RSSI();
}

String WiFiModule::getLocalIP() {
    return WiFi.localIP().toString();
}

String WiFiModule::getMAC() {
    return WiFi.macAddress();
}

void WiFiModule::disconnect() {
    WiFi.disconnect();
}

bool WiFiModule::isHealthy() const {
    return healthy_ && WiFi.status() == WL_CONNECTED;
}