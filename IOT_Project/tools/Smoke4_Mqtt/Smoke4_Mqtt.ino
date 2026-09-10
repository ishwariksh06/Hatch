/*
 * Smoke4_Mqtt.ino - smoke test 5 of 5. NOT part of the final system.
 *
 * Answers one question: can the laptop drive the buzzer over the network?
 * No IMU, no camera, no PERCLOS - just WiFi -> broker -> subscribe -> buzzer.
 * That isolates the eye path, so when you later run the real thing you know
 * any failure is the camera or the thresholds, never the transport.
 *
 * It also self-tests the buzzer with two short beeps at boot, so a silent
 * DROWSY afterwards can only be MQTT, not wiring.
 *
 * HOW TO DRIVE IT (Administrator not needed), on the laptop:
 *   & "C:\Program Files\mosquitto\mosquitto_pub.exe" -h localhost \
 *       -t "drowsiness/eyes" -m "DROWSY"       -> buzzer ON
 *   & "C:\Program Files\mosquitto\mosquitto_pub.exe" -h localhost \
 *       -t "drowsiness/eyes" -m "NORMAL"       -> buzzer OFF
 *
 * Keep MQTT_HOST / WIFI_* identical to ESP32_Drowsiness.ino. The laptop IP
 * changes with the network - re-check with ipconfig and reflash.
 *
 * Re-upload ESP32_Drowsiness.ino when you are done here.
 */
#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "Ishwari";
const char* WIFI_PASS = "ishwari1116";
const char* MQTT_HOST = "10.239.237.40";     // laptop LAN IP - verify first!
const uint16_t MQTT_PORT = 1883;
const char* TOPIC_EYES = "drowsiness/eyes";

const int BUZZER_PIN = 18;      // NOT GPIO4 - ADC2, glitches under active WiFi
const int BUZZER_ON  = LOW;    // low-level trigger module
const int BUZZER_OFF = HIGH;

// PASSIVE buzzer - a steady level only ticks on the edge. Must be driven with
// a square wave. Keep in sync with ESP32_Drowsiness.ino.
const bool BUZZER_IS_PASSIVE = true;
const unsigned int BUZZER_TONE_HZ = 2000;

void buzzerSilent() {
  noTone(BUZZER_PIN);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_OFF);
}

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

bool buzzing = false;
unsigned long lastMqttAttempt = 0;
unsigned long lastReport = 0;
String clientId;

void setBuzzer(bool on) {
  if (on == buzzing) return;
  buzzing = on;
  if (BUZZER_IS_PASSIVE) {
    if (on) tone(BUZZER_PIN, BUZZER_TONE_HZ);
    else    buzzerSilent();
  } else {
    digitalWrite(BUZZER_PIN, on ? BUZZER_ON : BUZZER_OFF);
  }
  Serial.print(F("[BUZZER] "));
  Serial.println(on ? F("ON") : F("OFF"));
}

void onMqttMessage(char* topic, byte* payload, unsigned int len) {
  char msg[16];
  unsigned int n = len < sizeof(msg) - 1 ? len : sizeof(msg) - 1;
  memcpy(msg, payload, n);
  msg[n] = '\0';
  if (strcmp(topic, TOPIC_EYES) != 0) return;

  Serial.print(F("[MQTT] rx \""));
  Serial.print(msg);
  Serial.println(F("\""));
  setBuzzer(strcmp(msg, "DROWSY") == 0);
}

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
    Serial.println(F("[MQTT] now publish DROWSY / NORMAL from the laptop"));
  } else {
    Serial.print(F("failed, rc="));
    Serial.print(mqtt.state());
    Serial.println(F(" (retrying in 3s)"));
    Serial.println(F("  rc=-2 -> cannot reach the broker: wrong IP, mosquitto"));
    Serial.println(F("          not on 0.0.0.0:1883, firewall, or the two"));
    Serial.println(F("          devices are on different networks."));
    setBuzzer(false);      // never alert on a stale verdict
  }
}

void setup() {
  // First thing, before anything else: the pin floats low during boot and
  // low = ON for this module, so silence it immediately.
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_OFF);

  Serial.begin(115200);
  delay(600);
  Serial.println(F("\n\n######## SMOKE 4: WIFI + MQTT + BUZZER ########"));

  // Two short beeps: proves the buzzer works before the network is involved.
  // These are real 200 ms TONES, not level pulses - on a passive element a
  // level pulse only ticks, which is what made the earlier self-test
  // misleading. If you hear two clear notes here, the drive is correct.
  for (int i = 0; i < 2; i++) {
    if (BUZZER_IS_PASSIVE) tone(BUZZER_PIN, BUZZER_TONE_HZ);
    else                   digitalWrite(BUZZER_PIN, BUZZER_ON);
    delay(200);
    buzzerSilent();
    delay(200);
  }
  Serial.println(F("[BUZZER] self-test done - you should have heard 2 clear notes"));

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print(F("[WIFI] connecting to "));
  Serial.print(WIFI_SSID);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(400);
    Serial.print('.');
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("\n[WIFI] connected, ip="));
    Serial.print(WiFi.localIP());
    Serial.print(F(" rssi="));
    Serial.println(WiFi.RSSI());
  } else {
    Serial.println(F("\n[WIFI] FAILED - run tools/Diagnostics for the reason code"));
  }

  clientId = "esp32-smoke-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
}

void loop() {
  serviceMqtt();

  if (millis() - lastReport >= 2000) {
    lastReport = millis();
    Serial.print(F("[STATUS] wifi="));
    Serial.print(WiFi.status() == WL_CONNECTED ? F("up") : F("DOWN"));
    Serial.print(F("  mqtt="));
    Serial.print(mqtt.connected() ? F("up") : F("DOWN"));
    Serial.print(F("  buzzer="));
    Serial.println(buzzing ? F("ON") : F("off"));
  }
  delay(20);
}
