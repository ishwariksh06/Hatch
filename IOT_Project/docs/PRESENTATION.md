# Driver Drowsiness Detection System — Presentation Deck

Target: **12–14 slides, ~10 minutes + demo**. Speaker notes are in _italics_.
Fill `< >` placeholders.

---

## Slide 1 — Title

**Driver Drowsiness Detection System**
A two-signal IoT approach — eyes + head tilt

<Team names> · <Course> · <College> · Guide: <Prof.> · 2025–26

_Say: "Our system watches two things at once — whether your eyes are closing and
whether your head is nodding — and alerts if either one says you're falling
asleep."_

---

## Slide 2 — The Problem

- Drowsy driving is a major, under-reported cause of road crashes.
- Unlike drunk/distracted driving, fatigue shows **visible early signs**:
  slow eye closure, head nodding.
- Commercial driver-monitoring exists — but only in expensive cars.
- **Goal:** a low-cost, retrofittable alert that works even when parts fail.

_One line: "If a machine can see the same signs a passenger would, it can wake
the driver."_

---

## Slide 3 — Objectives

1. Detect prolonged eye closure from a webcam.
2. Detect sustained head tilt from an inertial sensor.
3. Fuse both signals over a lightweight network protocol (MQTT).
4. Sound an alert within a few seconds of a real event.
5. Keep the head-tilt alert working with **no network at all**.
6. Keep it cheap and reproducible.

---

## Slide 4 — What We Deliberately Left Out

Considered and dropped **on purpose**, to keep the demo dependable:

- Vibration motor · OLED display · GPS logging · SD-card storage
- Cloud dashboard (Blynk) · Telegram alerts · On-device ML (TinyML)

_Say: "A feature that impresses but breaks on stage is worse than a plain one
that works. We scoped down to four components."_

---

## Slide 5 — System Architecture (diagram slide)

```
 LAPTOP NODE                              ESP32 NODE
 webcam → MediaPipe → EAR                 MPU6050 (GPIO32/33) → pitch
   → PERCLOS (60 s window)                  → sustained tilt?
   → "DROWSY" / "NORMAL"     ── MQTT ──►   subscribes to eye verdict
 Mosquitto broker (localhost)  drowsiness/  buzzer if EITHER is drowsy
                               eyes         (GPIO5, LOW = ON)
```

- **Laptop** does the heavy vision work.
- **ESP32** does fast local inertial sensing + drives the buzzer.
- **Split = built-in redundancy:** each node owns one signal.

---

## Slide 6 — Signal 1: Eye Closure (EAR + PERCLOS)

- **EAR (Eye Aspect Ratio):** 6 landmarks per eye —

  ```
  EAR = (‖p2 − p6‖ + ‖p3 − p5‖) / (2 · ‖p1 − p4‖)
  ```

  ~0.30 open → ~0.10 closed. Scale-invariant (works near or far from camera).
- **Per frame:** `eye closed = EAR < 0.22`. Both eyes averaged. No face ⇒ open.
- **PERCLOS** = Σ(closed time) / Σ(total time) over the last 60 s.
  Normal blinking ≈ 0.03–0.07; we trigger at **0.30**.
- Single blinks don't trigger — only sustained closure does.

_Show a picture of the 6 landmarks per eye alongside the formula._

---

## Slide 7 — Signal 2: Head Tilt (MPU6050)

- Accelerometer only (no gyro integration → no drift to correct).
- At boot, capture the resting gravity direction **b** (avg of 100 samples).
- Tilt = **angle between** current and resting gravity vectors:

  ```
  deviation = arccos( (a · b) / (|a| · |b|) ) · 180 / π
  ```

- Light IIR smoothing rejects vibration: `a = 0.85·a + 0.15·a_new` per axis.
- Trigger: **> 30° held for > 1.5 s** (a nod, not a glance); clears below 25°.
- **Runs entirely on the ESP32 — no network needed.**

_Why not just compare pitch angles? `atan2` saturates at ±90°, and our module
rests at −85°. One tilt direction had only ~5° of range — the 30° threshold was
literally unreachable that way. Vector angle has no dead zone. Measured: idle
noise 0.0–0.3°, test peak 43.6°._

---

## Slide 8 — Sensor Fusion & Fail-Safes

- **OR logic:** buzzer sounds if eyes **OR** tilt say drowsy → no single
  failure hides a real event.
- **MQTT last-will:** laptop crash ⇒ broker auto-publishes `NORMAL` ⇒ buzzer
  can't stick on.
- **Stale-verdict guard:** MQTT drops ⇒ ESP32 forces `eyesDrowsy = false`.
- **Hysteresis:** stops the buzzer stuttering at the threshold.
- **Non-blocking firmware:** `loop()` never waits on Wi-Fi/MQTT.

_MQTT specifics: topic `drowsiness/eyes`, payload `DROWSY`/`NORMAL`, QoS 1,
retained, keepalive 15 s, broker = Mosquitto on the laptop (`0.0.0.0:1883`,
anonymous, local LAN only)._

---

## Slide 9 — Hardware

| Component | Role |
|---|---|
| ESP32-WROOM-32E | firmware, Wi-Fi, buzzer control |
| MPU6050 | head-tilt sensing (I²C) |
| MH-FMD buzzer | audible alert (low-level trigger) |
| Laptop webcam | eye-closure sensing |

Total cost: **< ₹ <amount> >**. Wiring: MPU6050 SDA=GPIO32 / SCL=GPIO33 /
AD0=GND (I²C `0x68`) / VCC=3.3 V; buzzer I/O=GPIO5.

Software: Python 3.10+ · OpenCV · MediaPipe Tasks API · paho-mqtt 2.1.0 ·
Arduino / ESP32 Dev Module · Adafruit MPU6050 2.2.9 · PubSubClient · Mosquitto.

---

## Slide 10 — Real Engineering Problems We Hit

_(This is the slide examiners like — concrete debugging.)_

| Problem | Cause | Fix |
|---|---|---|
| **Sensor "dead" — but it wasn't** | Module is an **MPU6500 clone**: `WHO_AM_I` = `0x70`, library accepts only `0x68`. Data was valid all along | talk to the chip **directly**, drop the library |
| **30° tilt unreachable one way** | `atan2` pitch saturates at ±90°; module rests at −85° | measure the **angle between gravity vectors** |
| **Sensor found every *other* boot** | reset mid-I²C-byte leaves slave holding SDA low | 9 recovery clocks + STOP → **6/6 boots** |
| Buzzer silent whenever Wi-Fi on | GPIO4 = ADC2, grabbed by Wi-Fi radio | move buzzer to GPIO5 |
| MPU6050 not on the I²C bus | default GPIO21/22 unusable on this build | remap I²C to GPIO32/33 (free, non-strapping) |
| Wi-Fi + MQTT "up", still no messages | laptop on a **5 GHz** hotspot; ESP32 can't see 5 GHz | put both on the same 2.4 GHz network |
| Buzzer chirps at boot | low-level-trigger + pin floats low on boot | drive HIGH on first line of `setup()` |
| MediaPipe tutorials all crash | mediapipe 1.0 removed the old API | rewrite with current Tasks API |
| Start-up false alarm | PERCLOS unstable on a near-empty window | require window ≥ 50 % full to alert |

_The theme worth saying out loud: in every one of the top three, the obvious
diagnosis — "bad wiring", "dead module" — was wrong. We found them by isolating
one layer at a time and reading raw values instead of trusting a component's
own verdict._

---

## Slide 11 — Testing: Layer by Layer

We never jumped to end-to-end. Each layer verified alone:

1. Buzzer (no Wi-Fi) ✅
2. IMU + tilt (no network) ✅
3. Wi-Fi connect ✅
4. MQTT connect + subscribe ✅
5. Camera + EAR ✅
6. Both paths independently ✅

We also built **three diagnostic sketches** — `BuzzerTest`, `Diagnostics`,
`MpuProbe` — so any failure can be attributed to a layer in seconds.
`MpuProbe` is what identified the clone.

_"Testing them separately is how we know which half broke."_

---

## Slide 12 — Results

**Both paths proven end-to-end on real hardware.**

| Metric | Result |
|---|---|
| Eye path | close eyes → laptop → broker → ESP32 → buzzer ✅ |
| Tilt path | peak **43.6°**, latched, buzzer sounded, cleared ✅ |
| IMU detection | **6/6** consecutive boots |
| Tilt idle noise | 0.0–0.3° vs a 30° threshold |
| Open-eye EAR | 0.26 / 0.30 → threshold 0.22 validated |
| Camera | 640×480 @ 29 fps |
| Firmware | 70 % flash, 14 % RAM, zero warnings |

```
[MPU] WHO_AM_I = 0x70 (MPU6500 clone - fine, accepted)
[MPU] found at 0x68
[MQTT] eyes -> DROWSY      [TILT] DROWSY - held 34.3 deg
[BUZZER] ON                [BUZZER] ON
```

**No open faults.**

---

## Slide 13 — Live Demo

1. Show the Python window — live EAR, PERCLOS bar, state.
2. **Close eyes ~10–15 s → buzzer sounds** (eye path over MQTT).
3. Hold board level, tilt/nod it → buzzer sounds (tilt path, ESP32 alone).
4. Unplug the laptop from Wi-Fi → **tilt still works** (graceful degradation).
5. Fallback ready: `mosquitto_pub -t drowsiness/eyes -m DROWSY`.

_Before presenting: reset the board **in its final resting position** — the
tilt baseline is captured at boot, and hold it still for the first ~2 s._

_Bring: desk lamp, phone hotspot (2.4 GHz!), USB cable, charged laptop._

---

## Slide 14 — Limitations & Future Work

**Limitations:** single face, lighting-sensitive EAR, hand-tuned tilt rule,
local-only (no cloud logging), no formal accuracy study.

**Future work:** on-device vision (ESP32-CAM / Pi) to drop the laptop · data
logging + dashboard · learned classifier (EAR + yawning + tilt) · seat/steering
vibration alert · field trial with labelled ground truth.

---

## Slide 15 — Conclusion / Thank You

- Working two-signal drowsiness detector, < ₹ <amount> >.
- Eye path proven end-to-end; tilt path independent of the network.
- Design consistently chose **reliability and graceful degradation** over
  feature count — the right call for a safety alert.

**Questions?**

---

## Anticipated Q&A (prep, not slides)

- **Why not do everything on the ESP32?** Face-landmark inference needs a
  CPU/GPU the ESP32 lacks. The split also gives redundancy.
- **Why MQTT and not HTTP?** Lightweight pub/sub, retained messages, last-will,
  built for constrained devices — one line to publish, one to subscribe.
- **What if the camera fails at the demo?** Tilt-only mode; or manual
  `mosquitto_pub`; the ESP32 never depends on the laptop being up.
- **Why 30° and 1.5 s?** Empirical — clears a real nod, never normal movement.
  It's a heuristic; a learned model is future work.
- **Why PERCLOS and not just "eyes closed now"?** PERCLOS is the transport-
  research-validated fatigue measure; it ignores normal blinks.
- **Is 0.30 PERCLOS too slow for a demo?** Yes — we can shorten the window to
  15 s for the demo; faster reaction, more false positives, a stated trade-off.
- **Security of the open broker?** Local demo LAN only, no internet, anonymous
  access is acceptable in that context; production would use TLS + auth.
- **Why not use the Adafruit MPU6050 library?** Our module is an MPU6500 clone
  reporting `WHO_AM_I = 0x70`; the library hard-rejects anything but `0x68`,
  even though the data is perfectly valid. Direct register access works with
  both genuine and clone parts and removed two dependencies.
- **Isn't dropping the chip-ID check unsafe?** We didn't drop validation, we
  moved it: instead of trusting an ID byte, `mpuBegin()` requires the device to
  ACK *and* return a physically plausible reading (≈1 g) before enabling tilt
  detection. That is a stronger check than the ID.
- **Why measure a vector angle instead of pitch?** Pitch saturates at ±90° and
  our module rests at −85°, so one tilt direction had almost no usable range.
  Vector angle gives a clean 0–180° at any mounting orientation.
- **What if the sensor isn't detected at the demo?** The sketch continues
  without it and the eye path still works; conversely the tilt path needs no
  network. Every single component can fail without taking the demo down.
