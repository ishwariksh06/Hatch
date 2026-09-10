/*
 * Diagnostics.ino - troubleshooting tool, NOT part of the final system.
 *
 * Upload this instead of the main sketch when something isn't working. It
 * tests each layer separately and tells you exactly which one is broken:
 *
 *   1. I2C bus scan      -> is the MPU6050 electrically present?
 *   2. WiFi network scan -> can the ESP32 even see the router?
 *   3. WiFi connect      -> with the real disconnect reason code
 *
 * Re-upload ESP32_Drowsiness.ino when you're done here.
 */
#include <WiFi.h>
#include <Wire.h>

const char* WIFI_SSID = "Ishwari";
const char* WIFI_PASS = "ishwari1116";

volatile int lastDisconnectReason = -1;

void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
    lastDisconnectReason = info.wifi_sta_disconnected.reason;
  }
}

void scanI2C() {
  Serial.println(F("\n--- 1. I2C bus scan (SDA=GPIO32, SCL=GPIO33) ---"));
  Wire.begin(32, 33);
  int found = 0;
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print(F("  found device at 0x"));
      if (addr < 16) Serial.print('0');
      Serial.println(addr, HEX);
      found++;
    }
  }
  if (found == 0) {
    Serial.println(F("  NO I2C DEVICES AT ALL."));
    Serial.println(F("  -> This is power or wiring, not software."));
    Serial.println(F("     Check: VCC on 3.3V (NOT 5V), GND shared,"));
    Serial.println(F("     SDA->GPIO32, SCL->GPIO33, and that the breadboard"));
    Serial.println(F("     rails you declared actually carry 3.3V and GND."));
  } else {
    Serial.print(F("  total devices: "));
    Serial.println(found);
    Serial.println(F("  (expect 0x68 for MPU6050 with AD0->GND;"));
    Serial.println(F("   0x69 would mean AD0 is floating or high)"));
  }
}

void scanWiFi() {
  Serial.println(F("\n--- 2. WiFi network scan ---"));
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  int n = WiFi.scanNetworks();
  if (n <= 0) {
    Serial.println(F("  no networks found at all - radio or antenna problem"));
    return;
  }
  bool sawTarget = false;
  for (int i = 0; i < n; i++) {
    bool isTarget = (WiFi.SSID(i) == WIFI_SSID);
    if (isTarget) sawTarget = true;
    Serial.print(isTarget ? F("  >> ") : F("     "));
    Serial.print(WiFi.SSID(i));
    Serial.print(F("  rssi="));
    Serial.print(WiFi.RSSI(i));
    Serial.print(F(" ch="));
    Serial.print(WiFi.channel(i));
    Serial.print(F(" enc="));
    Serial.println(WiFi.encryptionType(i));
  }
  Serial.print(F("\n  target \""));
  Serial.print(WIFI_SSID);
  Serial.println(sawTarget ? F("\" IS visible") : F("\" NOT visible!"));
  if (sawTarget) {
    Serial.println(F("  (rssi weaker than about -80 is marginal;"));
    Serial.println(F("   move the board closer to the router/phone)"));
  }
}

bool attempt(const char* label, bool pinToBssid) {
  Serial.print(F("\n  ["));
  Serial.print(label);
  Serial.print(F("] "));

  lastDisconnectReason = -1;
  WiFi.disconnect(true, true);   // drop config + erase stored AP info
  delay(1200);

  if (pinToBssid) {
    // Pin to the exact radio we saw in the scan. Rules out the ESP32 chasing
    // a different AP or band that happens to share the SSID.
    uint8_t bssid[6] = {0xb2, 0x01, 0xb4, 0x9a, 0x11, 0x91};
    WiFi.begin(WIFI_SSID, WIFI_PASS, 11, bssid, true);
  } else {
    WiFi.begin(WIFI_SSID, WIFI_PASS);
  }

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 12000) {
    delay(400);
    Serial.print('.');
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F(" CONNECTED  ip="));
    Serial.print(WiFi.localIP());
    Serial.print(F("  gw="));
    Serial.print(WiFi.gatewayIP());
    Serial.print(F("  rssi="));
    Serial.println(WiFi.RSSI());
    return true;
  }
  Serial.print(F(" failed  status="));
  Serial.print(WiFi.status());
  Serial.print(F("  reason="));
  Serial.println(lastDisconnectReason);
  return false;
}

void tryConnect() {
  Serial.println(F("\n--- 3. WiFi connect attempts ---"));
  Serial.print(F("  this ESP32's MAC = "));
  Serial.println(WiFi.macAddress());
  Serial.println(F("  (check this against the hotspot's blocked/allowed list)"));

  WiFi.onEvent(onWiFiEvent);

  // Repeat: a phone hotspot that is asleep often refuses the first try or two
  // and then admits the device. A consistent failure across all of these means
  // it is not transient.
  for (int i = 1; i <= 4; i++) {
    char label[12];
    snprintf(label, sizeof(label), "try %d", i);
    if (attempt(label, false)) return;
  }
  if (attempt("bssid-pin", true)) return;

  Serial.println(F("\n  ALL ATTEMPTS FAILED."));
  Serial.println(F("  Reason codes that matter:"));
  Serial.println(F("     5       = ASSOC_TOOMANY -> the AP is FULL. Kick a"));
  Serial.println(F("               device off the hotspot, or raise its"));
  Serial.println(F("               device limit. NOT a password problem."));
  Serial.println(F("     2 / 15  = AUTH_EXPIRE / 4WAY_HANDSHAKE_TIMEOUT"));
  Serial.println(F("               -> usually the PASSWORD is wrong, but can"));
  Serial.println(F("                  also appear transiently on a sleeping AP"));
  Serial.println(F("     201     = NO_AP_FOUND -> wrong SSID, or 5GHz-only"));
  Serial.println(F("     205     = CONNECTION_FAIL -> AP refused us"));
  Serial.println(F("     3 / 4   = ASSOC/DEAUTH -> AP dropped us, often"));
  Serial.println(F("               MAC filtering"));
}

void setup() {
  pinMode(18, OUTPUT);
  digitalWrite(18, HIGH);      // buzzer is on GPIO18 now, low-level trigger: HIGH = silent

  Serial.begin(115200);
  delay(600);
  Serial.println(F("\n\n######## DIAGNOSTICS ########"));

  scanI2C();
  scanWiFi();
  tryConnect();

  Serial.println(F("\n######## END - re-upload ESP32_Drowsiness.ino when done ########"));
}

void loop() {
  delay(1000);
}
