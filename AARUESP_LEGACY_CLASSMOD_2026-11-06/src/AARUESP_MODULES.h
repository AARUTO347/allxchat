#pragma once

/**
 * AARUESP - Master Module Include
 * By AARUTO - 2026
 *
 * Convenience header that includes the core library and ALL
 * available AARUESP modules. Include this to access everything:
 *
 *   #include <AARUESP_MODULES.h>
 *
 * Or include individual module headers only (e.g. #include <BME280Module.h>).
 */

#include "AARUESP.h"

// Sensors
#include "BME280Module.h"    // Temperature / humidity / pressure (I2C)
#include "BMP180Module.h"    // Pressure / temperature (I2C)
#include "DHT22Module.h"     // Temperature / humidity (1-Wire style DATA)
#include "HCSR04Module.h"    // Ultrasonic distance (TRIG/ECHO)
#include "HCSR501Module.h"   // PIR motion sensor
#include "BH1750Module.h"    // Digital light (lux)
#include "MPU6050Module.h"   // 6-axis IMU (accel + gyro)
#include "MQ2Module.h"       // Gas / smoke detector
#include "ACS712Module.h"    // Current sensor (5A/20A/30A)
#include "SoilMoistureModule.h" // Soil moisture (analog)
#include "PotentiometerModule.h" // Analog input / potentiometer

// Actuators
#include "LEDModule.h"       // Single LED control
#include "RGBLEDModule.h"    // RGB LED (PWM, HSV)
#include "RelayModule.h"     // Relay control
#include "ServoModule.h"     // Servo motor (0-180°)
#include "BuzzerModule.h"    // Buzzer / tones

// Displays
#include "OLEDModule.h"      // SSD1306 OLED (128x64, I2C, text)

// Communication
#include "UARTModule.h"      // UART passthrough (GPS/Bluetooth/serial)
#include "WiFiModule.h"      // WiFi connection manager

// Input
#include "ButtonModule.h"    // Debounced button (clicks & hold)
#include "EncoderModule.h"   // Rotary encoder with push button