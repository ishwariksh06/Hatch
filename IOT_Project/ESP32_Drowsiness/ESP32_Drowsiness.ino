/*
 * ESP32_Drowsiness.ino
 * Driver Drowsiness Detection - ESP32 node
 *
 * Reads an MPU6050 for sustained head tilt, subscribes over MQTT to the
 * laptop's eye-closure verdict, and sounds the buzzer if EITHER says drowsy.
 * Set REQUIRE_BOTH = true below to demand both at once instead - read the
 * note there first, it costs you the offline fallback.
 *
 * Board:  Tools > Board > ESP32 Dev Module   (Acebott ESP32-WROOM-32E)
 * Serial: 115200 baud
 * Libs:   PubSubClient only. The IMU is driven by direct register access over
 *         Wire - see the WHO_AM_I note below for why the Adafruit library is
 *         deliberately NOT used here.
 *
 * WIRING:
 *   MPU6050 SDA -> GPIO32      Buzzer VCC -> 3.3V
 *   MPU6050 SCL -> GPIO33      Buzzer GND -> GND
 *   MPU6050 AD0 -> GND         Buzzer I/O -> GPIO18  (was GPIO4, then GPIO5)
 *   MPU6050 VCC -> 3.3V
 *   MPU6050 GND -> GND
 *
 *   I2C moved off GPIO21/22 to GPIO32/33. The ESP32 can route I2C to almost
 *   any GPIO; 32 and 33 are plain input/output pins (ADC1, RTC) with no
 *   strapping role, and this dev board does not populate the optional 32.768
 *   kHz crystal that would otherwise use them - so they are free. If the
 *   MPU6050 is still not found after rewiring, try swapping the two wires:
 *   SDA and SCL crossed gives exactly the "NOT FOUND" symptom.
 *
 * !! GPIO4 DOES NOT WORK RELIABLY AS AN OUTPUT WHILE WIFI IS ACTIVE !!
 *    GPIO4 doubles as ADC2_CH0, and the ESP32's WiFi radio periodically
 *    claims the ADC2 channels for RF calibration. Confirmed on this board:
 *    the buzzer worked perfectly with WiFi off, went silent every time with
 *    WiFi on, using identical code - moving to GPIO5 (not an ADC2 pin) fixed
 *    it. Never put the buzzer (or anything else that must be a clean,
 *    always-on digital output) on GPIO 0/2/4/12/13/14/15/25/26/27 - all ADC2.
 *
 *    The buzzer has since moved again, from GPIO5 to GPIO18, after GPIO5
 *    stopped driving it at all - not even a bit-banged square wave, which is
 *    just digitalWrite in a loop, produced sound. GPIO5 is also a strapping
 *    pin (sampled at boot); GPIO18 is a plain output with no second job.
 *    Other safe choices on this board: GPIO19, GPIO23, GPIO16, GPIO17.
 *
 * !! OUR BUZZER IS PASSIVE, NOT ACTIVE !!
 *    Measured on this exact module: a steady level produces a single audible
 *    TICK on the voltage edge and then silence, however long it is held. A
 *    passive element is just a coil - it needs a square wave to keep the
 *    diaphragm moving. So setBuzzer() drives tone() rather than a level.
 *    Symptom if this is ever undone: the log says [BUZZER] ON, the pin is
 *    genuinely low, and the room stays quiet.
 *
 *    The module is still LOW-level trigger, which is why BUZZER_OFF is HIGH.
 *    That only matters for the silent state now - a square wave sounds the
 *    same whether or not the module inverts it.
 *
 * !! OUR IMU IS AN MPU6500 CLONE, NOT A GENUINE MPU6050 !!
 *    Measured on this exact module: it ACKs at 0x68 and returns perfectly good
 *    accelerometer data (|a| = 16262..16388 at rest, i.e. 1g), but its
 *    WHO_AM_I register (0x75) reads 0x70, not 0x68. Adafruit_MPU6050::begin()
 *    rejects anything whose WHO_AM_I is not exactly 0x68, so it returned false
 *    and the tilt path looked "broken" when the hardware was fine. Most cheap
 *    "MPU6050" modules on sale today are MPU6500/MPU9250 dies like this.
 *
 *    Rather than patch a third-party library (which any reinstall would undo),
 *    we talk to the chip directly over Wire. The registers we use are identical
 *    across MPU6050/6500/9250, so this works with a genuine part too, and it
 *    removes two library dependencies from the project.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>

// ---------------------------------------------------------------------------
// FILL THESE IN
// ---------------------------------------------------------------------------
const char* WIFI_SSID = "Ishwari";
const char* WIFI_PASS = "ishwari1116";

// Laptop's local IP (where Mosquitto runs). Detected on this laptop as
// 10.239.237.40 on the "Ishwari" network - re-check with `ipconfig` if you move
// networks, it WILL change and this line must be updated + reflashed.
const char* MQTT_HOST = "10.239.237.40";
const uint16_t MQTT_PORT = 1883;

// ---------------------------------------------------------------------------
// Pins & tunables
// ---------------------------------------------------------------------------
const int BUZZER_PIN = 18;   // NOT GPIO4 - see the ADC2/WiFi note above
const int BUZZER_ON  = LOW;   // low-level trigger module
const int BUZZER_OFF = HIGH;

// Our module is PASSIVE - see the note at the top of this file. Set this to
// false only if you swap in an ACTIVE buzzer, which sounds from a steady
// level and stays silent under tone().
const bool BUZZER_IS_PASSIVE = true;

// Drive frequency for the passive element. A passive buzzer has a resonant
// peak and is far louder at some frequencies than others - 2 kHz carries well
// over room noise. Drop to ~1000 if it is uncomfortably shrill in the room.
const unsigned int BUZZER_TONE_HZ = 2000;

// I2C for the MPU6050. Moved from the ESP32 default 21/22 to 32/33.
const int MPU_SDA_PIN = 32;
const int MPU_SCL_PIN = 33;

// IMU registers. Same addresses on MPU6050, MPU6500 and MPU9250.
const uint8_t MPU_ADDR         = 0x68;   // AD0 -> GND
const uint8_t REG_CONFIG       = 0x1A;   // DLPF (digital low-pass filter)
const uint8_t REG_ACCEL_CONFIG = 0x1C;   // accelerometer full-scale range
const uint8_t REG_ACCEL_XOUT_H = 0x3B;   // first of 6 accel bytes
const uint8_t REG_PWR_MGMT_1   = 0x6B;   // sleep bit lives here
const uint8_t REG_WHO_AM_I     = 0x75;   // 0x68 genuine, 0x70 MPU6500, etc.

const char* TOPIC_EYES = "drowsiness/eyes";

// How the two drowsiness signals combine into one buzzer decision.
//
//   false (default) = OR  : eyes OR tilt alone raises the alarm.
//   true            = AND : both must be drowsy at the same moment.
//
// OR is the default deliberately. A real driver nods OR closes their eyes -
// rarely both in the same instant - so AND misses most genuine events. It
// also kills the offline fallback: with AND, the buzzer can never fire while
// WiFi or the broker is down, because the eye verdict is forced to normal.
//
// Flip this to true only if you specifically want "both at once" behaviour,
// and expect to have to nod AND close your eyes together to demo it.
const bool REQUIRE_BOTH = false;

// Tilt is measured as deviation from the resting pose captured at boot, not as
// an absolute angle - the MPU6050's mounting orientation is arbitrary, so an
// absolute 30 degrees would mean something different on every remount.
float TILT_ANGLE_THRESHOLD = 30.0;    // degrees away from resting pose
const unsigned long TILT_HOLD_MS = 1500;  // must stay past threshold this long

// Hysteresis, same idea as PERCLOS_RELEASE_MARGIN on the laptop side: once we
// have latched DROWSY, the tilt must fall this many degrees BELOW the
// threshold before we clear it. Without this the buzzer chatters whenever the
// board happens to rest near the threshold - measured on this rig resting at
// 28.4 deg after a test, i.e. 1.6 deg from flipping state on a nudge.
const float TILT_RELEASE_MARGIN = 5.0;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

bool mpuReady = false;

// Resting gravity direction captured at boot, stored as a unit vector.
float baseX = 0.0, baseY = 0.0, baseZ = 1.0;
// Smoothed current acceleration, in raw counts.
float accX = 0.0, accY = 0.0, accZ = 0.0;
bool  accPrimed = false;        // false until the filter has its first sample
float tiltDeviation = 0.0;      // degrees away from the resting pose

bool eyesDrowsy = false;        // from the laptop, over MQTT
bool tiltDrowsy = false;        // from our own MPU6050
bool buzzing = false;

unsigned long tiltPastThresholdSince = 0;   // 0 = not currently past threshold
unsigned long lastMqttAttempt = 0;
unsigned long lastReport = 0;

String clientId;

// ---------------------------------------------------------------------------
// Buzzer
// ---------------------------------------------------------------------------
void setBuzzer(bool on) {
  if (on == buzzing) return;
  buzzing = on;
  if (BUZZER_IS_PASSIVE) {
    if (on) {
      tone(BUZZER_PIN, BUZZER_TONE_HZ);
    } else {
      noTone(BUZZER_PIN);
      // tone() hands the pin to the LEDC peripheral and leaves it wherever
      // the waveform stopped. Take it back and park it at the silent level,
      // or the coil can sit with DC across it.
      pinMode(BUZZER_PIN, OUTPUT);
      digitalWrite(BUZZER_PIN, BUZZER_OFF);
    }
  } else {
    digitalWrite(BUZZER_PIN, on ? BUZZER_ON : BUZZER_OFF);
  }
  Serial.print(F("[BUZZER] "));
  Serial.println(on ? F("ON") : F("off"));
}

// ---------------------------------------------------------------------------
// MQTT
// ---------------------------------------------------------------------------
void onMqttMessage(char* topic, byte* payload, unsigned int len) {
  // Payload is not null-terminated; copy into a bounded buffer.
  char msg[16];
  unsigned int n = len < sizeof(msg) - 1 ? len : sizeof(msg) - 1;
  memcpy(msg, payload, n);
  msg[n] = '\0';

  if (strcmp(topic, TOPIC_EYES) != 0) return;

  bool wasDrowsy = eyesDrowsy;
  eyesDrowsy = (strcmp(msg, "DROWSY") == 0);
  if (eyesDrowsy != wasDrowsy) {
    Serial.print(F("[MQTT] eyes -> "));
    Serial.println(msg);
  }
}

// Non-blocking reconnect. Critical for the fallback demo: if WiFi or the
// broker is down, tilt detection must keep working. Nothing here ever blocks
// the main loop waiting on the network.
void serviceMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (mqtt.connected()) { mqtt.loop(); return; }

  if (millis() - lastMqttAttempt < 3000) return;
  lastMqttAttempt = millis();

  Serial.print(F("[MQTT] connecting to "));
  Serial.print(MQTT_HOST);
  Serial.print(F("... "));

  if (mqtt.connect(clientId.c_str())) {
    Serial.println(F("connected"));
    mqtt.subscribe(TOPIC_EYES);
    Serial.print(F("[MQTT] subscribed to "));
    Serial.println(TOPIC_EYES);
  } else {
    Serial.print(F("failed, rc="));
    Serial.print(mqtt.state());
    Serial.println(F(" (retrying in 3s)"));
    // If the broker link drops we must not keep alerting on a stale verdict.
    eyesDrowsy = false;
  }
}

// ---------------------------------------------------------------------------
// MPU6050
// ---------------------------------------------------------------------------
// Frees a stuck I2C bus before Wire takes it over.
//
// The ESP32 can be reset (RTS from an upload, or the EN button) in the middle
// of an I2C byte. The IMU never sees a STOP, so it keeps holding SDA low
// waiting for clocks that never come, and every later transaction fails - the
// board reports "MPU NOT FOUND" even though nothing is wrong with the wiring.
// Observed on this rig: identical firmware found the chip on one boot and not
// on the next. Nine manual clock pulses let the slave finish its byte, then a
// STOP condition returns the bus to idle. Harmless when the bus is already
// healthy, so it runs on every boot.
void i2cBusRecover() {
  pinMode(MPU_SDA_PIN, INPUT_PULLUP);
  pinMode(MPU_SCL_PIN, OUTPUT);
  for (int i = 0; i < 9; i++) {
    digitalWrite(MPU_SCL_PIN, HIGH);
    delayMicroseconds(5);
    digitalWrite(MPU_SCL_PIN, LOW);
    delayMicroseconds(5);
  }
  digitalWrite(MPU_SCL_PIN, HIGH);
  delayMicroseconds(5);

  // STOP = SDA rising while SCL is high.
  pinMode(MPU_SDA_PIN, OUTPUT);
  digitalWrite(MPU_SDA_PIN, LOW);
  delayMicroseconds(5);
  digitalWrite(MPU_SDA_PIN, HIGH);
  delayMicroseconds(5);

  pinMode(MPU_SDA_PIN, INPUT_PULLUP);
  pinMode(MPU_SCL_PIN, INPUT_PULLUP);
}

bool mpuWrite(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(val);
  return Wire.endTransmission() == 0;
}

// Reads the six accelerometer bytes as raw signed counts.
bool mpuReadAccel(int16_t& ax, int16_t& ay, int16_t& az) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;   // repeated start
  if (Wire.requestFrom((int)MPU_ADDR, 6) != 6) return false;
  ax = (int16_t)((Wire.read() << 8) | Wire.read());
  ay = (int16_t)((Wire.read() << 8) | Wire.read());
  az = (int16_t)((Wire.read() << 8) | Wire.read());
  return true;
}

// Brings the IMU up. Deliberately does NOT reject a part whose WHO_AM_I is
// not 0x68 - see the clone note at the top of this file. We only require that
// the chip answers and returns a plausible reading.
bool mpuBegin() {
  // Retry the address probe. A module that has just been powered up, or a bus
  // that needed the recovery above, can miss the very first transaction.
  bool ack = false;
  for (int tries = 0; tries < 10 && !ack; tries++) {
    Wire.beginTransmission(MPU_ADDR);
    ack = (Wire.endTransmission() == 0);
    if (!ack) delay(50);
  }
  if (!ack) return false;                           // nothing at this address

  bool idOk = false;
  uint8_t who = 0;
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_WHO_AM_I);
  if (Wire.endTransmission(false) == 0 && Wire.requestFrom((int)MPU_ADDR, 1) == 1) {
    who = Wire.read();
    idOk = true;
  }

  if (!mpuWrite(REG_PWR_MGMT_1, 0x00)) return false; // clear SLEEP bit
  delay(100);                                        // let it settle
  mpuWrite(REG_CONFIG, 0x04);        // DLPF ~21 Hz, matches the old settings
  mpuWrite(REG_ACCEL_CONFIG, 0x08);  // +/-4 g full scale

  // Sanity check: at rest the magnitude should be about 1g. The exact LSB/g
  // does not matter for us - pitch is an angle, so any common scale factor
  // cancels out - but an all-zero or wildly wrong reading means trouble.
  int16_t ax, ay, az;
  if (!mpuReadAccel(ax, ay, az)) return false;
  float mag = sqrt((float)ax * ax + (float)ay * ay + (float)az * az);
  if (mag < 2000.0) return false;    // effectively zero: asleep or dead

  if (idOk) {
    Serial.print(F("[MPU] WHO_AM_I = 0x"));
    if (who < 16) Serial.print('0');
    Serial.print(who, HEX);
    if (who == 0x68)      Serial.println(F(" (genuine MPU6050)"));
    else if (who == 0x70) Serial.println(F(" (MPU6500 clone - fine, accepted)"));
    else if (who == 0x71) Serial.println(F(" (MPU9250 clone - fine, accepted)"));
    else                  Serial.println(F(" (unlisted clone - accepted, data looks sane)"));
  }
  Serial.print(F("[MPU] rest magnitude = "));
  Serial.print(mag, 0);
  Serial.println(F(" counts (about 1g)"));
  return true;
}

// Reports the board's tilt as the ANGLE BETWEEN the current gravity vector and
// the resting one, rather than as a difference of pitch angles.
//
// Why not pitch? pitch = atan2(-ax, hypot(ay,az)) saturates at +/-90 degrees.
// Measured on this rig the resting pitch is -83.9 deg, i.e. almost exactly at
// that limit, because the module happens to be mounted with its X axis close
// to vertical. Tilting one way could then only ever move pitch about 6 degrees
// before it folded back toward -90 - so a 30 degree threshold was unreachable
// in that direction. The angle between two vectors has no such limit: it runs
// cleanly from 0 to 180 degrees for any mounting orientation.
//
//   deviation = acos( (a . base) / (|a| |base|) )
//
// Raw counts are fine throughout - normalising cancels the LSB/g scale factor.
float computeTiltDeviation() {
  float mag = sqrt(accX * accX + accY * accY + accZ * accZ);
  if (mag < 1.0) return tiltDeviation;      // no usable reading, hold last

  float dot = (accX * baseX + accY * baseY + accZ * baseZ) / mag;
  // Rounding can push this a hair outside [-1,1], and acos() of that is NaN.
  if (dot > 1.0) dot = 1.0;
  if (dot < -1.0) dot = -1.0;
  return acos(dot) * 180.0 / PI;
}

// Pulls one sample into the smoothing filter. Light IIR, same 0.85/0.15 blend
// as before, but applied per axis so there is no angle wrap-around to worry
// about. Returns false if the I2C read failed.
bool sampleAccel() {
  int16_t ax, ay, az;
  if (!mpuReadAccel(ax, ay, az)) return false;
  if (!accPrimed) {
    accX = ax; accY = ay; accZ = az;        // seed, don't ramp up from zero
    accPrimed = true;
  } else {
    accX = 0.85 * accX + 0.15 * (float)ax;
    accY = 0.85 * accY + 0.15 * (float)ay;
    accZ = 0.85 * accZ + 0.15 * (float)az;
  }
  return true;
}

// Informational only - shown in the status line so the orientation is legible.
// The alert decision uses computeTiltDeviation(), never this.
float displayPitch() {
  return atan2(-accX, sqrt(accY * accY + accZ * accZ)) * 180.0 / PI;
}

void calibrateBaseline() {
  Serial.println(F("[MPU] hold the board in its normal upright pose..."));
  delay(1000);

  // Average the raw gravity vector, then store it normalised.
  float sx = 0, sy = 0, sz = 0;
  int got = 0;
  const int N = 100;
  for (int i = 0; i < N; i++) {
    int16_t ax, ay, az;
    if (mpuReadAccel(ax, ay, az)) {
      sx += ax; sy += ay; sz += az;
      got++;
    }
    delay(10);
  }

  float mag = sqrt(sx * sx + sy * sy + sz * sz);
  if (got == 0 || mag < 1.0) {
    Serial.println(F("[MPU] baseline capture FAILED - tilt detection disabled"));
    mpuReady = false;
    return;
  }
  baseX = sx / mag;
  baseY = sy / mag;
  baseZ = sz / mag;

  // Seed the smoothing filter at the resting pose so deviation starts at 0
  // instead of sweeping in from an arbitrary value.
  accX = sx / got;
  accY = sy / got;
  accZ = sz / got;
  accPrimed = true;
  tiltDeviation = 0.0;

  Serial.print(F("[MPU] resting pose captured from "));
  Serial.print(got);
  Serial.print(F(" samples (pitch "));
  Serial.print(displayPitch(), 1);
  Serial.println(F(" deg)"));
  Serial.println(F("[MPU] tilt = angle away from this pose, 0-180 deg, no dead zone"));
}

void updateTilt() {
  if (!mpuReady) return;

  // Light smoothing to keep road/desk vibration from flickering the state.
  // A failed read just leaves the filter where it was.
  sampleAccel();
  tiltDeviation = computeTiltDeviation();
  float deviation = tiltDeviation;

  if (deviation >= TILT_ANGLE_THRESHOLD) {
    if (tiltPastThresholdSince == 0) {
      tiltPastThresholdSince = millis();
    } else if (!tiltDrowsy && millis() - tiltPastThresholdSince >= TILT_HOLD_MS) {
      tiltDrowsy = true;
      Serial.print(F("[TILT] DROWSY - held "));
      Serial.print(deviation, 1);
      Serial.println(F(" deg past threshold"));
    }
  } else {
    // Arming always needs a fresh continuous TILT_HOLD_MS above the threshold,
    // so the hold timer restarts as soon as we drop below it...
    tiltPastThresholdSince = 0;
    // ...but an already-latched alert only clears once we are clearly back,
    // below threshold minus the release margin. Between the two we hold state.
    if (tiltDrowsy && deviation < TILT_ANGLE_THRESHOLD - TILT_RELEASE_MARGIN) {
      Serial.print(F("[TILT] clear - back to "));
      Serial.print(deviation, 1);
      Serial.println(F(" deg"));
      tiltDrowsy = false;
    }
  }
}

// ---------------------------------------------------------------------------
// Setup / loop
// ---------------------------------------------------------------------------
void setup() {
  // FIRST, before anything else: silence the buzzer. GPIO4 floats low during
  // the ESP32's boot, and low = ON for this module, so any delay here is an
  // audible chirp. (A short chirp at power-on is normal and unavoidable - it
  // happens before this line can run. It stops as soon as setup() begins.)
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_OFF);

  Serial.begin(115200);
  delay(300);
  Serial.println(F("\n=== Driver Drowsiness Detection - ESP32 node ==="));
  Serial.print(F("[MODE] alert when "));
  Serial.println(REQUIRE_BOTH ? F("eyes AND tilt are both drowsy")
                              : F("eyes OR tilt is drowsy"));

  // --- MPU6050 ---
  i2cBusRecover();                        // clear a slave left holding SDA low
  Wire.begin(MPU_SDA_PIN, MPU_SCL_PIN);   // SDA=GPIO32, SCL=GPIO33
  if (mpuBegin()) {             // AD0 -> GND fixes the address at 0x68
    mpuReady = true;
    Serial.println(F("[MPU] found at 0x68"));
    calibrateBaseline();
  } else {
    Serial.println(F("[MPU] NOT FOUND - check SDA=GPIO32, SCL=GPIO33, AD0=GND, VCC=3.3V"));
    Serial.println(F("[MPU] continuing anyway; eye detection over MQTT will still work"));
  }

  // --- WiFi (non-blocking from here on) ---
  clientId = "esp32-drowsiness-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);         // keeps MQTT latency low
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print(F("[WiFi] connecting to "));
  Serial.print(WIFI_SSID);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("[WiFi] connected, ESP32 IP = "));
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(F("[WiFi] FAILED - running in tilt-only mode, will keep retrying"));
  }

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setKeepAlive(15);
}

void loop() {
  // WiFi retry, non-blocking.
  static unsigned long lastWifiRetry = 0;
  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiRetry > 10000) {
    lastWifiRetry = millis();
    Serial.println(F("[WiFi] retrying..."));
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    eyesDrowsy = false;   // don't alert on a stale verdict while offline
  }

  serviceMqtt();
  updateTilt();

  // Combine the two signals. See REQUIRE_BOTH above.
  setBuzzer(REQUIRE_BOTH ? (eyesDrowsy && tiltDrowsy)
                         : (eyesDrowsy || tiltDrowsy));

  // Once a second, print the full picture. This is your main debugging view -
  // watch it in Serial Monitor at 115200 while testing each layer.
  if (millis() - lastReport >= 1000) {
    lastReport = millis();
    Serial.print(F("wifi="));
    Serial.print(WiFi.status() == WL_CONNECTED ? F("up") : F("DOWN"));
    Serial.print(F(" mqtt="));
    Serial.print(mqtt.connected() ? F("up") : F("DOWN"));
    if (mpuReady) {
      Serial.print(F(" pitch="));
      Serial.print(displayPitch(), 1);
      Serial.print(F(" dev="));
      Serial.print(tiltDeviation, 1);
    } else {
      Serial.print(F(" pitch=n/a"));
    }
    Serial.print(F(" eyes="));
    Serial.print(eyesDrowsy ? F("DROWSY") : F("normal"));
    Serial.print(F(" tilt="));
    Serial.print(tiltDrowsy ? F("DROWSY") : F("normal"));
    Serial.print(F(" buzzer="));
    Serial.println(buzzing ? F("ON") : F("off"));
  }

  delay(20);   // ~50 Hz sampling
}
