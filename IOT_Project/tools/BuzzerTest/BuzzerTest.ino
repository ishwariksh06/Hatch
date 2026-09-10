/*
 * BuzzerTest.ino - diagnostic only, NOT part of the final system.
 *
 * Answers one question: is the MH-FMD an ACTIVE or a PASSIVE buzzer?
 *
 *   ACTIVE  buzzer = has its own oscillator inside. Sounds from a steady
 *                    level. This is what ESP32_Drowsiness.ino assumes.
 *   PASSIVE buzzer = just a coil. A steady level makes NO sound at all;
 *                    it needs a square wave to move the diaphragm.
 *
 * The test cycles:  steady LOW -> silence -> 2kHz tone -> 1kHz tone
 * with a serial announcement before each, so you can match what you hear
 * (or don't) to what the pin is doing.
 *
 * WHAT THE RESULT MEANS
 *   only the STEADY phase sounds  -> active buzzer, wiring is fine,
 *                                    the main sketch is already correct
 *   only the TONE phases sound    -> PASSIVE buzzer, the main sketch must
 *                                    generate a tone instead of a level
 *   nothing sounds in any phase   -> not a signal problem. No power to the
 *                                    module, or the module is dead.
 *
 * Re-upload ESP32_Drowsiness.ino when you're done here.
 */

const int BUZZER_PIN = 18;   // NOT GPIO4 - it's ADC2_CH0 and glitches under active WiFi

// Low-level trigger: LOW = on, HIGH = off. Same convention as the main sketch.
const int BUZZER_ON  = LOW;
const int BUZZER_OFF = HIGH;

void announce(const char* s) {
  Serial.print(F(">>> "));
  Serial.println(s);
}

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_OFF);
  Serial.begin(115200);
  delay(600);
  Serial.println(F("\n\n######## BUZZER TEST ########"));
  Serial.println(F("Listen for which phases make sound. Cycles forever."));
}

void loop() {
  // --- Phase 1: steady level, exactly what the main sketch does ---
  announce("PHASE 1: steady LOW for 4s  (an ACTIVE buzzer sounds here)");
  digitalWrite(BUZZER_PIN, BUZZER_ON);
  delay(4000);
  digitalWrite(BUZZER_PIN, BUZZER_OFF);

  announce("    ...silence 2s...");
  delay(2000);

  // --- Phase 2: square wave. tone() drives the pin via LEDC. ---
  announce("PHASE 2: 2kHz square wave for 4s  (a PASSIVE buzzer sounds here)");
  tone(BUZZER_PIN, 2000);
  delay(4000);
  noTone(BUZZER_PIN);
  // tone() leaves the pin wherever it stopped - force it back to silent.
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_OFF);

  announce("    ...silence 2s...");
  delay(2000);

  // --- Phase 3: a lower tone. Passive elements have a resonant peak and
  //     can be much louder at one frequency than another. ---
  announce("PHASE 3: 1kHz square wave for 4s");
  tone(BUZZER_PIN, 1000);
  delay(4000);
  noTone(BUZZER_PIN);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_OFF);

  announce("    ...silence 3s, then repeating...\n");
  delay(3000);
}
