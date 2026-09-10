/*
 * Smoke0_Board.ino - smoke test 1 of 5. NOT part of the final system.
 *
 * Answers one question: is the board itself alive and flashable?
 * Nothing is connected for this test - pull the MPU6050 and the buzzer out
 * first, so a shorted peripheral cannot make a good board look dead.
 *
 * Tests, in order: USB/CH340 enumerates -> upload succeeds -> serial prints
 * at 115200 -> a GPIO can actually drive a pin (onboard LED on GPIO2).
 *
 * PASS = "tick 1, 2, 3..." in the monitor AND the blue LED blinking 1 Hz.
 *
 * NOTE: LED_BUILTIN is undefined for this board profile, so GPIO2 is written
 * explicitly. GPIO2 is fine for an LED (it is ADC2, but WiFi is off here).
 */

const int LED_PIN = 2;

unsigned long ticks = 0;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);
  delay(600);                 // let the USB serial settle before printing
  Serial.println(F("\n\n######## SMOKE 0: BOARD ALIVE ########"));
  Serial.println(F("Expect a tick every second and the blue LED blinking."));
  // Only calls that exist in every ESP32 core version, so this sketch cannot
  // fail to compile on an older core and muddy the very first test.
  Serial.print(F("Chip rev "));
  Serial.print(ESP.getChipRevision());
  Serial.print(F("  cpu "));
  Serial.print(ESP.getCpuFreqMHz());
  Serial.print(F(" MHz  free heap "));
  Serial.println(ESP.getFreeHeap());
  Serial.println(F("Nothing else should be wired up for this test.\n"));
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  delay(500);
  Serial.print(F("tick "));
  Serial.println(++ticks);
}
