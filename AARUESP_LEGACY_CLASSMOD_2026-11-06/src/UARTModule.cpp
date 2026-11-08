#include "UARTModule.h"
#include <stdarg.h>
#include <stdio.h>
#include <string.h>

UARTModule::UARTModule(int rxPin, int txPin, long baud)
    : rxPin_(rxPin), txPin_(txPin), baud_(baud), uartPort_( nullptr), readPos_(0), readAvailable_(0) {}

bool UARTModule::init() {
    // Use the main HardwareSerial port or a secondary one
    // On most ESP32 boards, we can use Serial2, Serial1, etc.
    // On ESP8266, we use the main Serial

#if defined(ESP32)
    // Try to use Serial2 as default UART if pins are available
    uartPort_ = &Serial2;
    uartPort_->begin(baud_, SERIAL_8N1, rxPin_, txPin_);
#elif defined(ESP8266)
    // On ESP8266, redirect the main Serial
    // Note: ESP8266 has only one UART, so we use SoftwareSerial emulation
    // or just use the main Serial with pin remapping
    uartPort_ = &Serial;
    uartPort_->begin(baud);
#endif

    // Small delay for UART to stabilize
    delay(100);

    // Test if UART is responding by checking available
    // (This is basic - real implementation would check for actual device)
    readAvailable_ = 0;
    readPos_ = 0;

    initialized_ = true;
    healthy_ = (uartPort_ != nullptr);
    
    AARUESP_DEBUG_PRINT("[UART] Initialized on pins RX=");
    AARUESP_DEBUG_PRINT(rxPin_);
    AARUESP_DEBUG_PRINT(" TX=");
    AARUESP_DEBUG_PRINTLN(txPin_);
    return healthy_;
}

size_t UARTModule::write(uint8_t* data, size_t length) {
    if (!uartPort_ || !initialized_) return 0;
    
    size_t written = uartPort_->write(data, length);
    return written;
}

size_t UARTModule::write(const char* str) {
    if (!uartPort_ || !initialized_) return 0;
    
    size_t written = uartPort_->write(str);
    return written;
}

size_t UARTModule::write(uint8_t byte) {
    if (!uartPort_ || !initialized_) return 0;
    
    size_t written = uartPort_->write(byte);
    return written;
}

size_t UARTModule::read(uint8_t* buffer, size_t maxLen) {
    if (!uartPort_ || !initialized_ || maxLen == 0) return 0;
    
    size_t toRead = min(maxLen, readAvailable_ - readPos_);
    if (toRead > 0) {
        memcpy(buffer, &readBuffer_[readPos_], toRead);
        readPos_ += toRead;
    }
    return toRead;
}

int UARTModule::read() {
    if (!uartPort_ || !initialized_) return -1;
    
    if (readAvailable_ > 0) {
        char c = uartPort_->read();
        // Update our internal buffer tracking
        if (readPos_ < sizeof(readBuffer_)) {
            readBuffer_[readPos_++] = static_cast<uint8_t>(c);
            readAvailable_--;
        }
        return static_cast<uint8_t>(c);
    }
    return -1;
}

size_t UARTModule::available() {
    if (!uartPort_ || !initialized_) return 0;

    // Return what's available from hardware
    return readAvailable_ - readPos_ + uartPort_->available();
}

void UARTModule::update() {
    // UART reads are synchronous; nothing to do per-tick.
    // Kept for API consistency with other modules.
}

bool UARTModule::isHealthy() const {
    return initialized_ && (uartPort_ != nullptr);
}

void UARTModule::print(const char* format, ...) {
    if (!uartPort_ || !initialized_) return;
    
    char buffer[128];
    va_list args;
    va_start(args, format);
    int n = vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);
    
    if (n > 0) {
        uartPort_->write(buffer);
    }
}

void UARTModule::println(const char* format, ...) {
    print(format);
    print("\r\n");
}