/*
 * Smoke2_Tilt.ino - smoke test 3 of 5. NOT part of the final system.
 *
 * Answers one question: does the tilt layer work end to end, on its own?
 * No WiFi, no MQTT, no buzzer decision - just the IMU and the same maths the
 * main sketch uses, printed every 200 ms so you can watch the number move
 * while you tip the board.
 *
 * This is deliberately NOT MpuProbe. MpuProbe explains why the Adafruit
 * library rejects our clone; this one proves the numbers the alert depends
 * on. The register access, the +/-4 g range, the 0.85/0.15 filter, the
 * baseline capture and the acos() deviation are all copied from
 * ESP32_Drowsiness.ino, so what you see here is what the main sketch sees.
 *
 * WIRING: VCC->3.3V  GND->GND  SDA->GPIO32  SCL->GPIO33  AD0->GND
 *
 * WHAT TO LOOK FOR
 *   boot          -> WHO_AM_I prints (0x70 on our module - expected, accepted)
 *                    and "rest magnitude" is a few thousand counts, not 0
 *   sitting still -> dev stays under about 2 deg and does not creep
 *   head-nod tilt -> dev climbs past 30 and the line shows PAST
 *   held 1.5 s    -> "TILT DROWSY" latches, exactly as the main sketch would
 *
 * If dev never reaches 30 deg however far you tip it, that is the mounting
 * orientation, not a fault - remount the module and re-run before touching
 * TILT_ANGLE_THRESHOLD.
 *
 * Re-upload ESP32_Drowsiness.ino when you are done here.
 */
#include <Wire.h>

const int MPU_SDA_PIN = 32;
const int MPU_SCL_PIN = 33;
const int BUZZER_PIN  = 18;      // held silent throughout this test

const uint8_t MPU_ADDR         = 0x68;
const uint8_t REG_CONFIG       = 0x1A;
const uint8_t REG_ACCEL_CONFIG = 0x1C;
const uint8_t REG_ACCEL_XOUT_H = 0x3B;
const uint8_t REG_PWR_MGMT_1   = 0x6B;
const uint8_t REG_WHO_AM_I     = 0x75;

// Same tunables as the main sketch. Keep them in sync if you retune there.
const float TILT_ANGLE_THRESHOLD = 30.0;
const unsigned long TILT_HOLD_MS = 1500;
const float TILT_RELEASE_MARGIN  = 5.0;

float baseX = 0, baseY = 0, baseZ = 1;
float accX = 0, accY = 0, accZ = 0;
bool  accPrimed = false;
float tiltDeviation = 0;
bool  tiltDrowsy = false;
float peakDeviation = 0;                 // handy when checking the threshold
unsigned long tiltPastThresholdSince = 0;

bool mpuWrite(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(val);
  return Wire.endTransmission() == 0;
}

bool mpuReadAccel(int16_t &ax, int16_t &ay, int16_t &az) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((int)MPU_ADDR, 6) != 6) return false;
  ax = (Wire.read() << 8) | Wire.read();
  ay = (Wire.read() << 8) | Wire.read();
  az = (Wire.read() << 8) | Wire.read();
  return true;
}

// Same recovery as the main sketch: a reset mid-byte leaves the IMU holding
// SDA low, and every later transaction fails until it finally sees a STOP.
void i2cBusRecover() {
  pinMode(MPU_SDA_PIN, INPUT_PULLUP);
  pinMode(MPU_SCL_PIN, OUTPUT);
  for (int i = 0; i < 9; i++) {
    digitalWrite(MPU_SCL_PIN, HIGH); delayMicroseconds(5);
    digitalWrite(MPU_SCL_PIN, LOW);  delayMicroseconds(5);
  }
  digitalWrite(MPU_SCL_PIN, HIGH); delayMicroseconds(5);
  pinMode(MPU_SDA_PIN, OUTPUT);
  digitalWrite(MPU_SDA_PIN, LOW);  delayMicroseconds(5);
  digitalWrite(MPU_SDA_PIN, HIGH); delayMicroseconds(5);
  pinMode(MPU_SDA_PIN, INPUT_PULLUP);
  pinMode(MPU_SCL_PIN, INPUT_PULLUP);
}

bool mpuInit() {
  uint8_t who = 0;
  bool ack = false;
  for (int i = 0; i < 5 && !ack; i++) {
    Wire.beginTransmission(MPU_ADDR);
    ack = (Wire.endTransmission() == 0);
    if (!ack) delay(50);
  }
  if (!ack) return false;

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_WHO_AM_I);
  if (Wire.endTransmission(false) == 0 && Wire.requestFrom((int)MPU_ADDR, 1) == 1) {
    who = Wire.read();
    Serial.print(F("[MPU] WHO_AM_I = 0x"));
    if (who < 16) Serial.print('0');
    Serial.print(who, HEX);
    if (who == 0x68)      Serial.println(F(" (genuine MPU6050)"));
    else if (who == 0x70) Serial.println(F(" (MPU6500 clone - fine, accepted)"));
    else if (who == 0x71) Serial.println(F(" (MPU9250 clone - fine, accepted)"));
    else                  Serial.println(F(" (unlisted clone - accepted if data is sane)"));
  }

  if (!mpuWrite(REG_PWR_MGMT_1, 0x00)) return false;   // clear SLEEP bit
  delay(100);
  mpuWrite(REG_CONFIG, 0x04);         // DLPF ~21 Hz
  mpuWrite(REG_ACCEL_CONFIG, 0x08);   // +/-4 g full scale

  int16_t ax, ay, az;
  if (!mpuReadAccel(ax, ay, az)) return false;
  float mag = sqrt((float)ax * ax + (float)ay * ay + (float)az * az);
  Serial.print(F("[MPU] rest magnitude = "));
  Serial.print(mag, 0);
  Serial.println(F(" counts"));
  return mag >= 2000.0;               // effectively zero = asleep or dead
}

void calibrateBaseline() {
  Serial.println(F("[MPU] hold the board in its normal upright pose..."));
  delay(1000);
  float sx = 0, sy = 0, sz = 0;
  int got = 0;
  for (int i = 0; i < 100; i++) {
    int16_t ax, ay, az;
    if (mpuReadAccel(ax, ay, az)) { sx += ax; sy += ay; sz += az; got++; }
    delay(10);
  }
  float mag = sqrt(sx * sx + sy * sy + sz * sz);
  if (got == 0 || mag < 1.0) {
    Serial.println(F("[MPU] baseline capture FAILED"));
    return;
  }
  baseX = sx / mag; baseY = sy / mag; baseZ = sz / mag;
  accX = sx / got;  accY = sy / got;  accZ = sz / got;
  accPrimed = true;
  Serial.print(F("[MPU] resting pose captured from "));
  Serial.print(got);
  Serial.println(F(" samples. Now tip the board.\n"));
}

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, HIGH);       // low-level trigger: HIGH = silent

  Serial.begin(115200);
  delay(800);
  Serial.println(F("\n\n######## SMOKE 2: IMU TILT ########"));

  i2cBusRecover();
  Wire.begin(MPU_SDA_PIN, MPU_SCL_PIN);
  Wire.setClock(100000);

  if (!mpuInit()) {
    Serial.println(F("[MPU] NOT FOUND."));
    Serial.println(F("  -> check VCC on 3.3V (not 5V), GND shared, AD0->GND,"));
    Serial.println(F("     SDA->GPIO32, SCL->GPIO33. Crossed SDA/SCL gives"));
    Serial.println(F("     exactly this symptom. Then run tools/Diagnostics."));
    return;
  }
  calibrateBaseline();
}

void loop() {
  int16_t ax, ay, az;
  if (!mpuReadAccel(ax, ay, az)) {
    Serial.println(F("[MPU] read failed - bus dropped out"));
    delay(500);
    return;
  }
  if (!accPrimed) { accX = ax; accY = ay; accZ = az; accPrimed = true; }
  accX = 0.85 * accX + 0.15 * (float)ax;
  accY = 0.85 * accY + 0.15 * (float)ay;
  accZ = 0.85 * accZ + 0.15 * (float)az;

  float mag = sqrt(accX * accX + accY * accY + accZ * accZ);
  float dot = (accX * baseX + accY * baseY + accZ * baseZ) / (mag > 1.0 ? mag : 1.0);
  if (dot > 1.0) dot = 1.0;
  if (dot < -1.0) dot = -1.0;
  tiltDeviation = acos(dot) * 180.0 / PI;
  if (tiltDeviation > peakDeviation) peakDeviation = tiltDeviation;

  bool past = tiltDeviation >= TILT_ANGLE_THRESHOLD;
  if (past) {
    if (tiltPastThresholdSince == 0) tiltPastThresholdSince = millis();
    else if (!tiltDrowsy && millis() - tiltPastThresholdSince >= TILT_HOLD_MS) {
      tiltDrowsy = true;
      Serial.println(F(">>> TILT DROWSY (this is where the buzzer would fire)"));
    }
  } else {
    tiltPastThresholdSince = 0;
    if (tiltDrowsy && tiltDeviation < TILT_ANGLE_THRESHOLD - TILT_RELEASE_MARGIN) {
      tiltDrowsy = false;
      Serial.println(F(">>> TILT CLEAR"));
    }
  }

  Serial.print(F("dev="));
  Serial.print(tiltDeviation, 1);
  Serial.print(F(" deg  peak="));
  Serial.print(peakDeviation, 1);
  Serial.print(past ? F("  PAST") : F("  ok  "));
  Serial.print(tiltDrowsy ? F("  [DROWSY]") : F("         "));
  Serial.print(F("  raw ax="));
  Serial.print(ax);
  Serial.print(F(" ay="));
  Serial.print(ay);
  Serial.print(F(" az="));
  Serial.println(az);

  delay(200);
}
