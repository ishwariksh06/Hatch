/*
 * MpuProbe.ino - diagnostic only, NOT part of the final system.
 *
 * Answers one question: the I2C scan finds a device at 0x68, but
 * Adafruit_MPU6050::begin() returns false. Why?
 *
 * begin() can fail at exactly two points (Adafruit_MPU6050.cpp:81-96):
 *   1. i2c_dev->begin()  - the address does not ACK
 *   2. WHO_AM_I (reg 0x75) != 0x68  - it ACKs, but it is not a genuine MPU6050
 *
 * Point 2 is the common one. Many cheap "MPU6050" modules are actually
 * MPU6500 / MPU9250 / clone dies that report a different WHO_AM_I:
 *   0x68 genuine MPU6050    0x70 MPU6500      0x71 MPU9250
 *   0x73 MPU9255            0x74 / 0x75 / 0x98 various clones
 * They are register-compatible for accelerometer reads, so the fix is simply
 * to stop rejecting them - not to buy another module.
 *
 * Re-upload ESP32_Drowsiness.ino when you're done here.
 */
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

const int SDA_PIN = 32;
const int SCL_PIN = 33;

Adafruit_MPU6050 mpu;

uint8_t readReg(uint8_t addr, uint8_t reg, bool *ok) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) { *ok = false; return 0; }
  if (Wire.requestFrom((int)addr, 1) != 1) { *ok = false; return 0; }
  *ok = true;
  return Wire.read();
}

void printHex(uint8_t v) {
  Serial.print(F("0x"));
  if (v < 16) Serial.print('0');
  Serial.print(v, HEX);
}

void setup() {
  pinMode(18, OUTPUT);
  digitalWrite(18, HIGH);        // buzzer silent (low-level trigger)

  Serial.begin(115200);
  delay(800);
  Serial.println(F("\n\n######## MPU PROBE ########"));

  Wire.begin(SDA_PIN, SCL_PIN);
  Serial.print(F("I2C on SDA=GPIO"));
  Serial.print(SDA_PIN);
  Serial.print(F(" SCL=GPIO"));
  Serial.println(SCL_PIN);

  // --- 1. which addresses ACK? ---
  Serial.println(F("\n1) bus scan"));
  for (byte a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      Serial.print(F("   ACK at "));
      printHex(a);
      Serial.println();
    }
  }

  // --- 2. raw WHO_AM_I at both possible addresses ---
  Serial.println(F("\n2) WHO_AM_I (register 0x75)"));
  for (uint8_t addr = 0x68; addr <= 0x69; addr++) {
    bool ok = false;
    uint8_t who = readReg(addr, 0x75, &ok);
    Serial.print(F("   addr "));
    printHex(addr);
    if (!ok) {
      Serial.println(F(" -> no response"));
      continue;
    }
    Serial.print(F(" -> WHO_AM_I = "));
    printHex(who);
    if (who == 0x68) Serial.println(F("  (genuine MPU6050)"));
    else if (who == 0x70) Serial.println(F("  (MPU6500 clone)"));
    else if (who == 0x71) Serial.println(F("  (MPU9250 clone)"));
    else if (who == 0x73) Serial.println(F("  (MPU9255 clone)"));
    else Serial.println(F("  (unrecognised clone)"));
  }

  // --- 3. what the Adafruit library decides ---
  Serial.println(F("\n3) Adafruit_MPU6050::begin(0x68)"));
  bool libOk = mpu.begin(0x68);
  Serial.print(F("   returned "));
  Serial.println(libOk ? F("TRUE  - library is happy") : F("FALSE - library rejected it"));

  // --- 4. can we read usable accelerometer data anyway? ---
  Serial.println(F("\n4) raw accelerometer readback (bypasses the library)"));
  // Wake the device: clear SLEEP bit in PWR_MGMT_1 (0x6B).
  Wire.beginTransmission(0x68);
  Wire.write(0x6B);
  Wire.write(0x00);
  Wire.endTransmission();
  delay(100);

  for (int i = 0; i < 5; i++) {
    Wire.beginTransmission(0x68);
    Wire.write(0x3B);                     // ACCEL_XOUT_H
    if (Wire.endTransmission(false) != 0) {
      Serial.println(F("   read failed"));
      break;
    }
    if (Wire.requestFrom(0x68, 6) != 6) {
      Serial.println(F("   short read"));
      break;
    }
    int16_t ax = (Wire.read() << 8) | Wire.read();
    int16_t ay = (Wire.read() << 8) | Wire.read();
    int16_t az = (Wire.read() << 8) | Wire.read();
    Serial.print(F("   ax="));
    Serial.print(ax);
    Serial.print(F(" ay="));
    Serial.print(ay);
    Serial.print(F(" az="));
    Serial.print(az);
    // At rest one axis should read near +/-16384 (1g at the +/-2g default range).
    Serial.print(F("   |a|="));
    Serial.println(sqrt((float)ax*ax + (float)ay*ay + (float)az*az), 0);
    delay(300);
  }

  Serial.println(F("\n   (at rest |a| should be near 16384 = 1g at the default"));
  Serial.println(F("    +/-2g range. All zeros = the chip is asleep or dead.)"));
  Serial.println(F("\n######## END ########"));
}

void loop() {
  delay(1000);
}
