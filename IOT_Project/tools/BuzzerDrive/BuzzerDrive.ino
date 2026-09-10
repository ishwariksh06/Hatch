/*
 * BuzzerDrive.ino - diagnostic only, NOT part of the final system.
 *
 * Answers one question: WHICH drive method actually makes this buzzer sound?
 *
 * We already know two facts from the bench:
 *   - a steady level produces a single TICK on the edge, then silence
 *     -> the element is passive, not active
 *   - tone() produced only two clicks, i.e. the start and stop edges
 *     -> no waveform is reaching the pin between them
 *
 * A passive element that clicks on an edge MUST sound when fed a square wave,
 * because a square wave is just those edges repeated. So the fault is in how
 * the waveform is generated, not in the wiring or the buzzer. This sketch
 * runs four different generators back to back and announces each one, so you
 * can hear which produces a real note.
 *
 * PHASES
 *   1. steady LOW              - the active-buzzer method. Expect a tick.
 *   2. tone()                  - Arduino wrapper. This is the one that failed.
 *   3. LEDC direct             - the hardware peripheral, no wrapper.
 *   4. bit-banged square wave  - digitalWrite in a tight loop. Cannot fail
 *                                unless the pin or the buzzer is dead, since
 *                                it is literally the tick, repeated.
 *
 * WHAT THE RESULT MEANS
 *   phase 3 sounds -> use ledcWriteTone in the main sketch
 *   phase 4 only   -> use the bit-banged tone (it blocks, so it needs a
 *                     little care in the main loop - tell me and I will wire
 *                     it in properly)
 *   nothing at all -> the signal jumper is not on GPIO18. Check it before
 *                     anything else; every phase here drives the same pin.
 *
 * Re-upload ESP32_Drowsiness.ino when you are done here.
 */

const int BUZZER_PIN = 18;
const int BUZZER_OFF = HIGH;          // low-level trigger: HIGH = idle/silent

void silence() {
  noTone(BUZZER_PIN);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_OFF);
}

void announce(const char* s) {
  Serial.print(F("\n>>> "));
  Serial.println(s);
}

// A square wave built by hand. freq in Hz, duration in ms.
// Half-period in microseconds: 1e6 / freq / 2.
void bitBangTone(unsigned int freq, unsigned long ms) {
  unsigned long halfUs = 500000UL / freq;
  unsigned long cycles = ((unsigned long)freq * ms) / 1000UL;
  pinMode(BUZZER_PIN, OUTPUT);
  for (unsigned long i = 0; i < cycles; i++) {
    digitalWrite(BUZZER_PIN, LOW);
    delayMicroseconds(halfUs);
    digitalWrite(BUZZER_PIN, HIGH);
    delayMicroseconds(halfUs);
  }
  digitalWrite(BUZZER_PIN, BUZZER_OFF);
}

void setup() {
  silence();
  Serial.begin(115200);
  delay(700);
  Serial.println(F("\n\n######## BUZZER DRIVE TEST ########"));
  Serial.print(F("ESP32 Arduino core "));
  Serial.print(ESP_ARDUINO_VERSION_MAJOR);
  Serial.print('.');
  Serial.print(ESP_ARDUINO_VERSION_MINOR);
  Serial.print('.');
  Serial.println(ESP_ARDUINO_VERSION_PATCH);
  Serial.println(F("Listen to each phase and note which ones make a real NOTE"));
  Serial.println(F("as opposed to a click. Cycles forever."));
}

void loop() {
  // --- Phase 1: steady level (the active-buzzer method) ---
  announce("PHASE 1: steady LOW, 3s   - expect only a tick");
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  delay(3000);
  silence();
  delay(1500);

  // --- Phase 2: Arduino tone() ---
  announce("PHASE 2: tone() 2kHz, 3s  - this is the one that failed");
  tone(BUZZER_PIN, 2000);
  delay(3000);
  silence();
  delay(1500);

  // --- Phase 3: the LEDC peripheral directly, no Arduino wrapper ---
  announce("PHASE 3: LEDC direct 2kHz, 3s");
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  // Core 3.x API: attach the pin itself, no channel bookkeeping.
  if (ledcAttach(BUZZER_PIN, 2000, 10)) {
    ledcWriteTone(BUZZER_PIN, 2000);
    delay(3000);
    ledcWriteTone(BUZZER_PIN, 0);
    ledcDetach(BUZZER_PIN);
  } else {
    Serial.println(F("    ledcAttach FAILED"));
  }
#else
  // Core 2.x API: set up a channel, then bind the pin to it.
  ledcSetup(0, 2000, 10);
  ledcAttachPin(BUZZER_PIN, 0);
  ledcWriteTone(0, 2000);
  delay(3000);
  ledcWriteTone(0, 0);
  ledcDetachPin(BUZZER_PIN);
#endif
  silence();
  delay(1500);

  // --- Phase 4: bit-banged square wave. The tick, repeated. ---
  announce("PHASE 4a: bit-banged 2kHz, 2s  - this one cannot fail");
  bitBangTone(2000, 2000);
  delay(1000);

  announce("PHASE 4b: bit-banged 1kHz, 2s  - passive elements have a");
  announce("          resonant peak, so one may be far louder");
  bitBangTone(1000, 2000);
  delay(1000);

  announce("PHASE 4c: bit-banged 4kHz, 2s");
  bitBangTone(4000, 2000);

  silence();
  announce("...3s gap, then the whole cycle repeats...\n");
  delay(3000);
}
