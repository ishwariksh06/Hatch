# Driver Drowsiness Detection System — Project Report

> Fill the blanks in angle brackets (`< >`) with your own details. Everything
> else is drawn from the actual working system in this repository.

---

## 1. Title Page

- **Project title:** Driver Drowsiness Detection System — A Two-Signal IoT Approach
- **Course / subject:** <Internet of Things / Embedded Systems>
- **Institution:** <College name, Department>
- **Team members:** <Name 1 (roll no.)>, <Name 2>, <Name 3>, <Name 4>, <Name 5>
- **Guide / faculty in-charge:** <Prof. Name>
- **Academic year:** 2025–26
- **Date of submission:** <date>

---

## 2. Abstract

Driver fatigue is a leading contributor to road accidents. This project builds a
low-cost, real-time driver drowsiness detection system that combines **two
independent physiological signals**:

1. **Eye closure**, measured from a webcam using the Eye Aspect Ratio (EAR) and
   the PERCLOS (Percentage of Eye Closure) metric.
2. **Head tilt / nodding**, measured with an MPU6050 inertial sensor on an
   ESP32 microcontroller.

The two nodes communicate over a local MQTT network. If **either** signal
indicates drowsiness, a buzzer sounds an immediate audible alert. The system is
designed to keep working even if the network fails: the ESP32 continues to
detect head tilt entirely on its own. The complete system was built and
demonstrated live using off-the-shelf components costing under <₹ amount>.

**Keywords:** drowsiness detection, EAR, PERCLOS, MPU6050, ESP32, MQTT, IoT,
road safety, computer vision.

---

## 3. Introduction

### 3.1 Motivation

- Fatigue-related crashes account for a significant share of road fatalities.
  Unlike drunk or distracted driving, drowsiness gives visible early warning
  signs — slow eye closure and head nodding — that a machine can detect.
- Commercial driver-monitoring systems exist but are expensive and built into
  premium vehicles. A retrofittable, low-cost solution has clear value.

### 3.2 Problem statement

Design and implement an embedded IoT system that detects driver drowsiness in
real time from more than one signal, raises an immediate local alert, and
degrades gracefully when any single subsystem (camera, network, sensor) fails.

### 3.3 Objectives

1. Detect prolonged eye closure using a standard webcam and computer vision.
2. Detect sustained head tilt using an inertial sensor on a microcontroller.
3. Fuse the two signals over a lightweight messaging protocol (MQTT).
4. Produce an audible alert within a few seconds of a genuine drowsiness event.
5. Ensure the head-tilt path remains functional with no network connection.
6. Keep the total component cost low and the build reproducible.

### 3.4 Scope

**In scope:** webcam eye-closure detection, MPU6050 head-tilt detection, local
MQTT broker, buzzer alert, live demonstration.

**Out of scope (deliberately excluded to keep the demo reliable):** vibration
motor, OLED display, GPS logging, SD-card storage, cloud dashboards (Blynk),
messaging alerts (Telegram), and on-device machine learning (TinyML). These
were considered and dropped in favour of a system that is dependable on stage.

---

## 4. Literature / Background

| Concept | Summary | Use in this project |
|---|---|---|
| **Eye Aspect Ratio (EAR)** | Soukupová & Čech (2016): ratio of vertical to horizontal eye-landmark distances. ~0.3 open, ~0.1 closed. Scale-invariant. | Per-frame "is the eye closed" decision. |
| **PERCLOS** | Wierwille et al. (1994): fraction of a time window with eyes ≥80% closed. The most validated drowsiness measure in transport research. | Rolling 60 s window; the actual DROWSY trigger, not single blinks. |
| **Head-nod / postural cues** | Fatigue produces slow head drops; detectable with an accelerometer. | MPU6050 pitch deviation from a resting baseline. |
| **MQTT** | Lightweight publish/subscribe protocol for constrained devices. | Carries the eye verdict from laptop to ESP32. |
| **Sensor fusion (OR logic)** | Combining independent detectors raises recall; an OR rule ensures no single failure hides a real event. | Buzzer sounds if eyes OR tilt say drowsy. |

---

## 5. System Architecture

### 5.1 Overview diagram

```
 ┌─────────────────────────── LAPTOP NODE ───────────────────────────┐
 │  Built-in webcam                                                   │
 │      │ frames (~17 fps)                                            │
 │      ▼                                                             │
 │  MediaPipe Face Landmarker  ──►  6 eye landmarks per eye           │
 │      │                                                             │
 │      ▼                                                             │
 │  EAR per frame  ──►  "eye closed?" (EAR < 0.22)                    │
 │      │                                                             │
 │      ▼                                                             │
 │  PERCLOS over rolling 60 s window                                  │
 │      │                                                             │
 │      ▼                                                             │
 │  State machine (with hysteresis)  ──►  "DROWSY" / "NORMAL"         │
 │      │                                                             │
 │  Mosquitto MQTT broker (localhost)  ◄── publishes on state change  │
 └──────────────────────────────┬────────────────────────────────────┘
                                │  topic: drowsiness/eyes
                                │  Wi-Fi LAN (or phone hotspot)
                                ▼
 ┌─────────────────────────── ESP32 NODE ────────────────────────────┐
 │  MPU6050 (I²C on GPIO32/33) ──► accel pitch ──► deviation from     │
 │                       boot-time baseline                           │
 │      │                                                             │
 │      ▼                                                             │
 │  Sustained tilt? (> 30° for > 1.5 s)  ──►  tiltDrowsy              │
 │                                                                    │
 │  PubSubClient subscriber  ──►  eyesDrowsy (from MQTT)              │
 │                                                                    │
 │  setBuzzer(eyesDrowsy OR tiltDrowsy)                               │
 │      │                                                             │
 │      ▼                                                             │
 │  MH-FMD buzzer on GPIO5  (LOW = ON — low-level trigger module)     │
 └────────────────────────────────────────────────────────────────────┘
```

### 5.2 Why the processing is split across two devices

- **Vision is heavy.** Face-landmark inference needs a CPU/GPU the ESP32 does
  not have. The laptop does it.
- **Inertial sensing is light and latency-critical.** The MPU6050 talks I²C to
  the ESP32 directly; no round trip needed.
- **The split gives natural redundancy.** Each node owns one signal, so losing
  one node still leaves a working detector.

### 5.3 Data / message flow

| Step | From | To | Content | Trigger |
|---|---|---|---|---|
| 1 | Webcam | Laptop script | Video frame | ~17 fps |
| 2 | Laptop script | Mosquitto | `drowsiness/eyes` = `DROWSY`/`NORMAL` (retained, QoS 1) | On state change only |
| 3 | Mosquitto | ESP32 | Same message | On publish |
| 4 | ESP32 | Buzzer | GPIO5 LOW/HIGH | `eyesDrowsy OR tiltDrowsy` changes |

**Last-will message:** if the laptop script crashes or drops off the network,
the broker automatically publishes `NORMAL` on its behalf, so the buzzer can
never get stuck on.

---

## 6. Hardware

### 6.1 Bill of materials

| # | Component | Spec | Qty | Approx. cost |
|---|---|---|---|---|
| 1 | ESP32 dev board | ESP32-WROOM-32E (Acebott), USB-C | 1 | <₹ > |
| 2 | IMU sensor | MPU6050, 6-axis, I²C | 1 | <₹ > |
| 3 | Buzzer module | MH-FMD, active, **low-level trigger** | 1 | <₹ > |
| 4 | Webcam | Laptop's built-in camera | 1 | — |
| 5 | Breadboard + jumper wires | half-size | 1 set | <₹ > |
| 6 | Laptop | runs Python + Mosquitto | 1 | — |
| | | | **Total** | **<₹ >** |

### 6.2 Wiring table

| Component pin | ESP32 pin | Note |
|---|---|---|
| MPU6050 SDA | GPIO32 | I²C data (moved from GPIO21) |
| MPU6050 SCL | GPIO33 | I²C clock (moved from GPIO22) |
| MPU6050 AD0 | GND | fixes I²C address to `0x68` |
| MPU6050 VCC | 3.3 V | **not 5 V** |
| MPU6050 GND | GND | |
| Buzzer VCC | 3.3 V | |
| Buzzer GND | GND | |
| Buzzer I/O | **GPIO5** | moved from GPIO4 — see 6.3 |

### 6.3 Design decisions and hardware quirks (worth putting in the report — they show real engineering)

1. **Buzzer is a low-level-trigger module.** `LOW` = sounding, `HIGH` = silent —
   inverted from the intuitive assumption. The firmware uses named constants
   `BUZZER_ON` / `BUZZER_OFF` and drives the pin `HIGH` on the very first line
   of `setup()` so it cannot chirp on boot.
2. **Buzzer moved from GPIO4 to GPIO5.** GPIO4 is `ADC2_CH0`. The ESP32's Wi-Fi
   radio periodically claims the ADC2 channels for RF calibration, which made
   the buzzer go silent whenever Wi-Fi was active — with *identical* code it
   worked fine with Wi-Fi off. GPIO5 is not an ADC2 pin. **Avoid GPIO
   0/2/4/12/13/14/15/25/26/27 for always-on digital outputs when Wi-Fi runs.**
3. **I²C moved from GPIO21/22 to GPIO32/33.** The ESP32's I²C peripheral can be
   routed to almost any GPIO. GPIO32/33 are plain I/O pins (ADC1, RTC domain),
   are not boot-strapping pins, and the optional 32.768 kHz crystal that would
   otherwise use them is not populated on this board — so they are free and
   safe for the MPU6050 bus.
4. **The IMU is an MPU6500 clone, and the Adafruit library rejects it.** Our
   module ACKs at `0x68` and returns perfectly valid accelerometer data
   (|a| = 16262–16388 counts at rest, i.e. exactly 1 g), but its `WHO_AM_I`
   register reads **`0x70`**, not `0x68`. `Adafruit_MPU6050::begin()` compares
   `WHO_AM_I` against `0x68` and returns `false` for anything else, so the
   sensor appeared "not found" while being completely healthy. Most cheap
   "MPU6050" modules sold today are MPU6500/MPU9250 dies like this. Rather than
   patch a third-party library (any reinstall would undo it), the sketch talks
   to the chip directly; the registers are identical across MPU6050/6500/9250,
   so it also works with a genuine part.
5. **I²C bus recovery on every boot.** An ESP32 reset mid-I²C-byte leaves the
   slave holding SDA low, waiting for clocks that never come, so every later
   transaction fails — identical firmware found the chip on one boot and not the
   next. `i2cBusRecover()` issues nine manual SCL pulses plus a STOP condition
   before `Wire.begin()`, which frees the bus. Detection went from intermittent
   to **6/6 boots**.
6. **Tilt is measured relative to a boot-time baseline**, not as an absolute
   angle, so the IMU's mounting orientation does not matter and no re-tuning is
   needed after remounting.
7. **Accelerometer-only sensing** (no gyro integration) — we only care about a
   sustained static tilt, so there is no drift to correct.
8. **A brief chirp at power-on is unavoidable** — the pin floats low during the
   ESP32 boot ROM, before any user code runs. It stops the instant `setup()`
   begins.
9. **USB-serial chip is a CH340** (not the CP2102 the markings suggest);
   `LED_BUILTIN` is undefined for this board profile — use GPIO2 explicitly.

---

## 7. Software

### 7.1 Laptop node — `laptop_drowsiness_detector.py`

- **Language / libraries:** Python 3.10+ (verified on 3.14.4), OpenCV
  (`opencv-python`), MediaPipe (Tasks API — `FaceLandmarker`), `paho-mqtt`
  2.1.0, NumPy.
- **Model file:** `face_landmarker.task` (MediaPipe face model, ~3.7 MB).
- **Pipeline per frame:**
  1. Capture and mirror the frame.
  2. Run MediaPipe `detect_for_video` with a strictly-increasing millisecond
     timestamp derived from real elapsed time (not an assumed frame rate).
  3. Compute EAR for each eye from 6 landmarks; average the two.
  4. `closed = EAR < EAR_THRESHOLD`. No face detected ⇒ counted as *open*
     (a driver turning their head must not silently accumulate PERCLOS).
  5. Feed `(timestamp, frame duration, closed)` into the PERCLOS rolling window.
  6. Run the state machine; publish only on change.
- **State machine with hysteresis:**
  - `NORMAL → DROWSY` when `PERCLOS ≥ 0.30` **and** the window is at least 50 %
    full (stops a start-up false alarm).
  - `DROWSY → NORMAL` only when `PERCLOS < 0.30 − 0.05` (release margin stops
    the buzzer stuttering at the threshold).
- **Robustness features:**
  - MQTT last-will = `NORMAL` (retained).
  - Publishes are `retain=True` so an ESP32 that connects late immediately
    learns the current verdict.
  - `dt` is capped at 0.5 s so a momentary hitch cannot skew PERCLOS.
  - On clean exit the script publishes `NORMAL`.
- **Operator keys:** `q` quit, `c` calibrate to current open-eye EAR (prints a
  suggested threshold at 75 % of it), `r` reset the PERCLOS window.
- **On-screen overlay:** live EAR, PERCLOS vs threshold, current state,
  `NO FACE` / `EYES CLOSED` flags, and a "window filling …%" indicator.

### 7.2 ESP32 node — `ESP32_Drowsiness.ino`

- **Toolchain:** Arduino IDE, board = "ESP32 Dev Module", 115200 baud, ESP32
  core 3.3.11. USB-serial chip enumerates as **CH340** (not the CP2102 the
  markings suggest).
- **Libraries: PubSubClient only.** The IMU is driven by direct register access
  over `Wire` — see §6.3 quirk 4 for why the Adafruit library is deliberately
  not used. This removed two dependencies from the project.
- **`LED_BUILTIN` is undefined** for this board profile — use an explicit pin
  (GPIO2) for any onboard-LED test.
- **`setup()`:** silence buzzer → init serial → **recover the I²C bus** → init
  I²C on GPIO32/33 and the IMU at `0x68` (accepting any register-compatible
  part) → capture the resting gravity vector (100 samples) → connect Wi-Fi
  (15 s timeout, then non-blocking retry) → configure MQTT.
- **`loop()` (~50 Hz):**
  - Non-blocking Wi-Fi retry every 10 s.
  - Non-blocking MQTT service / reconnect every 3 s; on reconnect, re-subscribe.
  - `updateTilt()`: smooth the acceleration vector (0.85/0.15 IIR per axis),
    compute the angle away from the resting pose; if `≥ 30°` held continuously
    for `≥ 1500 ms`, set `tiltDrowsy`. Clearing requires dropping below
    `30° − 5°`; between the two the state holds (hysteresis).
  - `setBuzzer(eyesDrowsy || tiltDrowsy)`.
  - Once a second, print a full status line for debugging.
- **Fail-safe behaviour:**
  - If MQTT is down or the broker link drops, `eyesDrowsy` is forced `false` —
    never alert on a stale verdict.
  - If the IMU is not found, the sketch continues; the eye path over MQTT still
    works.
  - A failed I²C read leaves the smoothing filter where it was rather than
    yanking it toward zero.
  - Baseline capture is validated — if it fails, tilt detection is disabled
    rather than running on a garbage reference.
  - Nothing in `loop()` ever blocks on the network, so **tilt detection keeps
    working with the laptop switched off entirely.**

### 7.3 Broker — Mosquitto

- Runs locally on the laptop, listener on `0.0.0.0:1883`, `allow_anonymous true`
  (local demo network only — not a public broker, no internet required).
- Firewall rule added for inbound TCP 1883.

### 7.4 Key parameters (tunables)

| Parameter | Location | Value | Meaning |
|---|---|---|---|
| `EAR_THRESHOLD` | Python | 0.22 | EAR below this ⇒ eye closed for that frame (~78 % of measured open-eye EAR on the test webcam). |
| `PERCLOS_THRESHOLD` | Python | 0.30 | Fraction of the window closed before DROWSY. |
| `PERCLOS_WINDOW_S` | Python | 60 (demo: 15) | Rolling window length. A shorter window reacts faster at the cost of more false positives — a legitimate demo trade-off to explain. |
| `PERCLOS_RELEASE_MARGIN` | Python | 0.05 | Hysteresis on the way back to NORMAL. |
| `MIN_COVERAGE_TO_ALERT` | Python | 0.5 | Window must be at least half full before an alert is allowed (dropping to NORMAL is always allowed). |
| `TILT_ANGLE_THRESHOLD` | ESP32 | 30° | Angle away from the boot resting pose. Measured idle noise is 0.0–0.3°, a deliberate tilt reached 43.6° — large margin both sides. |
| `TILT_HOLD_MS` | ESP32 | 1500 | How long the tilt must persist before alerting. |
| `TILT_RELEASE_MARGIN` | ESP32 | 5° | Hysteresis: clearing needs a drop below 25°. Mirrors `PERCLOS_RELEASE_MARGIN`. |

### 7.5 Algorithms and formulas

**Eye Aspect Ratio (EAR)** — six landmarks per eye
`p1,p4` = eye corners (horizontal), `p2,p6` and `p3,p5` = upper/lower lid pairs:

```
EAR = (‖p2 − p6‖ + ‖p3 − p5‖) / (2 · ‖p1 − p4‖)
```

≈ 0.30 when the eye is open, ≈ 0.10 when closed. Being a ratio, it is
scale-invariant — stable as the driver moves nearer to or further from the
camera. The two eyes' EAR values are averaged.

**PERCLOS** — rolling window
Each frame contributes its own duration `dt` and a `closed` flag:

```
PERCLOS = Σ(dt where closed) / Σ(dt)      over the last PERCLOS_WINDOW_S seconds
```

Normal blinking ≈ 0.03–0.07, so the 0.30 trigger requires genuine sustained
closure. A frame with no face detected is counted as *open*.

**Head tilt** — accelerometer only, no gyro integration (no drift to correct,
since only a sustained static tilt matters).

At boot the resting gravity direction is captured as a unit vector **b**
(average of 100 samples). Each cycle the current acceleration **a** is smoothed
per axis with a first-order IIR low-pass to reject vibration:

```
a ← 0.85 · a + 0.15 · a_new        (applied to each of aₓ, a_y, a_z)
```

Tilt is then the **angle between** the current and resting gravity vectors:

```
deviation = arccos( (a · b) / (|a| · |b|) ) · 180 / π
```

*Why not a difference of pitch angles?* The obvious formulation,
`pitch = atan2(−aₓ, √(a_y²+a_z²))`, saturates at ±90°. On this rig the module
sits at a resting pitch of about **−85°**, right at that limit, so tilting one
way could only move the reading ~5° before it folded back — a 30° threshold was
**unreachable in that direction**. The angle between two vectors has no such
limit: it runs cleanly from 0° to 180° at any mounting orientation. This was a
real defect found during testing, not a theoretical concern.

Raw ADC counts are used throughout — normalising cancels the LSB/g scale
factor, so no unit conversion is needed.

### 7.6 MQTT configuration

| Item | Value |
|---|---|
| Broker | Mosquitto 2.x on the laptop, TCP port 1883 |
| Topic | `drowsiness/eyes` |
| Payload | `DROWSY` or `NORMAL` (plain text) |
| QoS | 1 |
| Retain | true — a late-connecting ESP32 immediately learns the current verdict |
| Last will | `NORMAL` (retained) — broker publishes this if the laptop script crashes or drops off the network, so the buzzer cannot stick on |
| ESP32 client ID | `esp32-drowsiness-<chip MAC>` |
| Keepalive | 15 s (both nodes) |
| Broker config | `listener 1883 0.0.0.0`, `allow_anonymous true` (local demo LAN only) |

---

## 8. Implementation Methodology

The team followed a strict **layer-by-layer bring-up** rather than building
everything and debugging end-to-end:

1. **Buzzer alone** — hard-coded beeps, no Wi-Fi. Confirmed the low-level-trigger
   inversion.
2. **MPU6050 alone** — `[MPU] found at 0x68`, watch `dev=` climb on tilt, confirm
   `tilt=DROWSY` and buzzer. *No network involved.*
3. **Wi-Fi** — confirm the ESP32 gets an IP. (2.4 GHz only — the ESP32 cannot see
   5 GHz.)
4. **MQTT** — confirm connect + subscribe; prove the broker from the laptop with
   `mosquitto_pub`/`mosquitto_sub` first.
5. **Camera** — run the Python script, verify landmarks and live EAR.
6. **Both paths independently** — cover camera + tilt board ⇒ buzzer; hold board
   level + close eyes ⇒ buzzer via MQTT.

Testing the paths *separately* is what makes it possible to say *which* half
failed when something breaks.

---

## 9. Testing and Results

### 9.1 Subsystem test results

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | Sketch compiles for ESP32 Dev Module | clean build | ✅ 70 % flash, 14 % RAM, zero warnings |
| 2 | Firmware upload + boot | boots, runs | ✅ COM5 (CH340), hash verified |
| 3 | Buzzer idle state | silent | ✅ low-level-trigger logic confirmed on hardware |
| 4 | Camera open | 640×480 | ✅ 29 fps |
| 5 | Face landmarks + EAR | valid EAR values | ✅ open-eye EAR 0.26 / 0.30 |
| 6 | EAR separates open/closed | threshold sits between | ✅ 0.400 open vs 0.067 closed, threshold 0.22 |
| 7 | EAR scale-invariance | unchanged when eye doubles in size | ✅ Δ < 1e-4 |
| 8 | PERCLOS arithmetic | 30 s closed in a 60 s window = 0.50 | ✅ exactly 0.50 |
| 9 | Start-up false-alarm guard | near-empty window cannot alert | ✅ suppressed |
| 10 | MQTT round trip | DROWSY then NORMAL received in order | ✅ PASS |
| 11 | MQTT retained message | late subscriber gets current state | ✅ received `NORMAL`, retain flag set |
| 12 | Wi-Fi connect | gets IP | ✅ first attempt, rssi −58 |
| 13 | Laptop ↔ ESP32 reachability | MQTT connects | ✅ laptop `10.239.24.40`, ESP32 `10.239.24.248`, same subnet |
| 14 | IMU detection | found at `0x68` | ✅ **6/6 consecutive boots** |
| 15 | IMU data sanity | ≈1 g at rest | ✅ 8077–8190 counts at ±4 g (8192 = 1 g) |
| 16 | Tilt idle noise | stable near zero | ✅ `dev` = 0.0–0.3° |
| 17 | **Eye path end-to-end** | eyes closed ⇒ buzzer | ✅ **PASS** laptop → broker → ESP32 → buzzer |
| 18 | **Tilt path end-to-end** | tilt ⇒ buzzer | ✅ **PASS** peak 43.6°, latched, buzzer sounded, cleared |

### 9.2 Sample end-to-end log (eye path)

```
wifi=up mqtt=up  eyes=normal  buzzer=off
  $ mosquitto_pub -t "drowsiness/eyes" -m "DROWSY"
[MQTT] eyes -> DROWSY
[BUZZER] ON
wifi=up mqtt=up  eyes=DROWSY  buzzer=ON
  $ mosquitto_pub -t "drowsiness/eyes" -m "NORMAL"
[MQTT] eyes -> NORMAL
[BUZZER] off
```

### 9.3 Sample tilt-path trace

```
  dev=   0.1    ok        |
  dev=  25.7    ok        |############
  dev=  43.6    ok        |#####################
  dev=  35.1    ok        |#################
   >> [TILT] DROWSY - held 34.3 deg past threshold
   >> [BUZZER] ON
  dev=  31.2  DROWSY BUZZ |###############
   >> [TILT] clear
   >> [BUZZER] off

max deviation reached : 43.6 deg  (threshold 30.0)
TILT PATH: PASS
```

### 9.4 Boot output of the final firmware

```
=== Driver Drowsiness Detection - ESP32 node ===
[MPU] WHO_AM_I = 0x70 (MPU6500 clone - fine, accepted)
[MPU] rest magnitude = 8077 counts (about 1g)
[MPU] found at 0x68
[MPU] resting pose captured from 100 samples (pitch -72.7 deg)
[MPU] tilt = angle away from this pose, 0-180 deg, no dead zone
[WiFi] connected, ESP32 IP = 10.239.24.248
[MQTT] connecting to 10.239.24.40... connected
[MQTT] subscribed to drowsiness/eyes
wifi=up mqtt=up pitch=-72.7 dev=0.0 eyes=normal tilt=normal buzzer=off
```

### 9.5 Observations

- EAR is a small, noisy target at 640×480 (~30 px eye width) — sitting closer to
  the camera markedly steadies it.
- Front lighting matters far more than resolution; a backlit face makes EAR
  collapse toward 0 / `NO FACE`.
- The retained-message design means the ESP32 always has a defined verdict, even
  right after a reconnect.
- Tilt idle noise (0.0–0.3°) is two orders of magnitude below the 30° threshold,
  so false tilt alarms are effectively impossible at rest.
- **A sensor that "does not work" is often a sensor the software refuses to
  talk to.** The single most useful debugging step in this project was reading
  the chip's raw registers instead of trusting a library's yes/no answer.

---

## 10. Challenges and How They Were Solved

| Challenge | Root cause | Resolution |
|---|---|---|
| Buzzer chirped / stayed on at boot | Low-level-trigger module + pin floats low during boot ROM | Drive pin `HIGH` on first line of `setup()`; use `BUZZER_ON/OFF` constants |
| Buzzer went silent whenever Wi-Fi was on | GPIO4 = ADC2, claimed by Wi-Fi for RF calibration | Move buzzer signal to GPIO5 (non-ADC2) |
| MediaPipe `AttributeError: no attribute 'solutions'` | mediapipe 1.0 removed the old `face_mesh` API used by every pre-2025 tutorial | Rewrite using the current Tasks API + `.task` model |
| Wi-Fi refused to associate (`reason=5`) | Hotspot device limit reached (`ASSOC_TOOMANY`), *not* a wrong password | Free a slot; never diagnose Wi-Fi from a single attempt |
| Risk: MQTT connects then fails forever | Possible client isolation on shared/ISP networks | Verified laptop↔ESP32 ping early; phone-hotspot fallback prepared |
| Start-up false DROWSY | PERCLOS ratio unstable when the window holds only 1–2 s of data | Require the window ≥ 50 % full before alerting; releasing to NORMAL always allowed |
| Buzzer stutters at the threshold | PERCLOS hovering exactly at 0.30 | Hysteresis: 0.05 release margin |
| Serial port not visible in Arduino IDE | Board uses a CH340 USB-serial chip despite CP2102 markings | Install CH340 driver |
| **IMU never detected on GPIO21/22** | Default I²C pins unusable on this build | Remap I²C to **GPIO32/33** — plain I/O, non-strapping, crystal not populated |
| **Bus scan finds `0x68` but library still says "not found"** | Module is an **MPU6500 clone**: `WHO_AM_I` = `0x70`, and `Adafruit_MPU6050::begin()` accepts only `0x68`. Sensor was healthy all along (1 g at rest) | Replace the library with **direct register access**; registers are identical across MPU6050/6500/9250. Also removed two dependencies |
| **IMU found on one boot, missing the next** | ESP32 reset mid-I²C-byte leaves the slave holding SDA low forever | `i2cBusRecover()`: nine SCL pulses + STOP before `Wire.begin()`, plus retries → **6/6 boots** |
| **30° tilt unreachable in one direction** | `atan2` pitch saturates at ±90°; module rests at ≈ −85°, so one direction had only ~5° of range | Measure the **angle between gravity vectors** instead: clean 0–180° at any orientation |
| **Tilt buzzer would chatter** | No hysteresis on the tilt path; board came to rest 1.6° from the threshold | `TILT_RELEASE_MARGIN = 5°` — arm above 30°, clear below 25° |
| **Wi-Fi and MQTT "up" on both devices, yet no messages** | Laptop had joined a **5 GHz** hotspot on a different subnet; the ESP32 cannot see 5 GHz at all | Put both on the same 2.4 GHz network; update the hard-coded `MQTT_HOST` and reflash |

---

## 11. Fallback / Demo-Day Plan

Ranked most to least preferred:

1. **Full system** as designed.
2. **Phone hotspot** (if campus Wi-Fi has client isolation) — pre-flash a second
   copy of the sketch with the hotspot IP so it is a 30 s swap, not a live debug.
3. **Tilt-only** — the ESP32 needs no network for tilt; tilting the board buzzes
   even with the laptop off. Demonstrates real embedded sensing on its own.
4. **Manual MQTT trigger** — run the Python script for the visuals, fire
   `mosquitto_pub` by hand for the buzzer if room lighting defeats the camera.
5. **Recorded video** of a successful run, recorded the night before.

**Kit to bring:** desk lamp, phone with hotspot data, USB cable, fully charged
laptop, spare MPU6050.

---

## 12. Limitations

- Single-face assumption; not validated in a moving vehicle or at night with IR.
- EAR is sensitive to glasses, extreme head pose, and lighting.
- 30° / 1.5 s tilt rule is a heuristic tuned by hand, not learned from data.
- Local MQTT only — no cloud logging, fleet view, or historical analytics.
- No formal accuracy study (precision/recall) against a labelled dataset.

---

## 13. Future Work

- On-device eye detection on a Raspberry Pi / ESP32-CAM to remove the laptop.
- Data logging + a simple dashboard for post-drive review.
- Learned drowsiness classifier fusing EAR, PERCLOS, yawning, and tilt.
- Vibration alert in the seat / steering wheel in addition to the buzzer.
- Field trial with volunteer drivers and a labelled ground-truth protocol.

---

## 14. Conclusion

The project delivers a working, low-cost, two-signal drowsiness detector, with
**both alert paths proven end-to-end on real hardware**: closing the eyes in
front of the webcam sounds the ESP32's buzzer across the MQTT network, and
tilting the board past 30° sounds it from the microcontroller alone, with no
network dependency.

The debugging was as instructive as the design. Three of the faults —
an IMU rejected by its own driver library for reporting the "wrong" chip ID
while returning perfectly valid data, a tilt threshold made unreachable in one
direction by the ±90° saturation of the pitch formula, and a sensor that
appeared dead every other boot because a reset had left the I²C bus stuck —
were all cases where the obvious diagnosis (bad wiring, dead module) was wrong.
Each was found by isolating one layer at a time and reading raw values instead
of trusting a component's own verdict.

The design consistently favours **reliability and graceful degradation** over
feature count: hysteresis on both detectors, a last-will message so the buzzer
cannot stick on, bus recovery on every boot, non-blocking networking, and a
tilt path that works with the laptop switched off. That is the right priority
for a safety alerting system, and for a live demonstration.

---

## 15. References

1. T. Soukupová and J. Čech, "Real-Time Eye Blink Detection using Facial
   Landmarks," 21st Computer Vision Winter Workshop, 2016.
2. W. W. Wierwille et al., "Research on Vehicle-Based Driver Status/Performance
   Monitoring," NHTSA, 1994. (PERCLOS)
3. Google MediaPipe — Face Landmarker task documentation.
4. MQTT Version 3.1.1 / 5.0 specification, OASIS.
5. Espressif ESP32 Technical Reference Manual (ADC2 / Wi-Fi note).
6. InvenSense MPU-6050 Product Specification.

---

## 16. Appendix

- **A. Full source:** `laptop_drowsiness_detector.py`, `ESP32_Drowsiness/ESP32_Drowsiness.ino`
- **B. Helper sketches:** `tools/BuzzerTest/`, `tools/Diagnostics/`
- **C. Setup commands:** Mosquitto install/config, firewall rule, model download
  (see repository `README.md`).
- **D. Team contribution table:** <who did hardware / firmware / vision / testing / report>
