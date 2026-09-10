/*
 * PinSweep.ino - diagnostic only, NOT part of the final system.
 *
 * Answers one question: WHICH GPIO is the buzzer signal wire actually on?
 *
 * Established on the bench so far:
 *   - scraping the signal jumper against the GND rail makes a clear rasp,
 *     so the buzzer element is alive and properly powered
 *   - a bit-banged square wave on GPIO5 produced nothing at all, even though
 *     that is the same edges the scraping produced
 * Those two facts together mean the pin is not driving the wire. Either the
 * pin is damaged, or the jumper is not in the hole we think it is - a dev
 * board silkscreen is easy to misread, and a jumper one row off looks
 * identical from above.
 *
 * So: LEAVE THE WIRE WHERE IT IS and let the sketch do the searching. It
 * bit-bangs a 2 kHz tone on each candidate pin in turn, announcing each one
 * before it plays. Bit-banging is used deliberately - it is just digitalWrite
 * in a loop, the same thing your hand did against the rail, so it cannot fail
 * for any subtle peripheral reason.
 *
 * WHAT THE RESULT MEANS
 *   you hear a tone during "GPIO18"  -> the wire is where you think it is and
 *                                       GPIO18 works. Flash the real sketch.
 *   you hear it during another pin   -> the jumper is physically on THAT pin.
 *                                       Either move the wire to 18, or set
 *                                       BUZZER_PIN to the pin you heard.
 *   silence on every pin             -> the wire is in a hole that is not a
 *                                       GPIO at all (a ground or an unused
 *                                       breadboard row), or it is broken.
 *                                       Reseat both ends and re-run.
 *
 * Every pin swept here is a safe plain output: no ADC2 (WiFi conflict), no
 * strapping pin, no flash pin, no UART0, and not the I2C pair 32/33.
 *
 * Re-upload ESP32_Drowsiness.ino when you are done here.
 */

// Candidate pins, in the order they will be tried.
const int PINS[] = {18, 19, 23, 16, 17, 25, 26, 27, 5, 4};
const int PIN_COUNT = sizeof(PINS) / sizeof(PINS[0]);

const unsigned int TONE_HZ = 2000;
const unsigned long TONE_MS = 1500;

// A square wave built by hand: the scrape test, automated.
void bitBangTone(int pin, unsigned int freq, unsigned long ms) {
  unsigned long halfUs = 500000UL / freq;
  unsigned long cycles = ((unsigned long)freq * ms) / 1000UL;
  pinMode(pin, OUTPUT);
  for (unsigned long i = 0; i < cycles; i++) {
    digitalWrite(pin, LOW);
    delayMicroseconds(halfUs);
    digitalWrite(pin, HIGH);
    delayMicroseconds(halfUs);
  }
  digitalWrite(pin, HIGH);        // park silent (low-level trigger module)
}

void setup() {
  Serial.begin(115200);
  delay(700);
  Serial.println(F("\n\n######## PIN SWEEP ########"));
  Serial.println(F("Leave the buzzer signal wire exactly where it is."));
  Serial.println(F("Each pin gets a 1.5s tone. Note WHICH pin you hear."));
  Serial.println(F("Cycles forever - listen through at least one full pass.\n"));

  // Park every candidate silent up front, so an undriven pin cannot float
  // low and hum along underneath the pin actually being tested.
  for (int i = 0; i < PIN_COUNT; i++) {
    pinMode(PINS[i], OUTPUT);
    digitalWrite(PINS[i], HIGH);
  }
}

void loop() {
  for (int i = 0; i < PIN_COUNT; i++) {
    Serial.print(F(">>> GPIO"));
    Serial.print(PINS[i]);
    Serial.println(F("  - listen now"));
    bitBangTone(PINS[i], TONE_HZ, TONE_MS);
    delay(800);                   // clear gap so the pins stay distinguishable
  }
  Serial.println(F("\n--- pass complete, repeating in 3s ---\n"));
  delay(3000);
}
