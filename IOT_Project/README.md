# Driver Drowsiness Detection System

Two-signal drowsiness detector. The laptop watches your eyes through the
webcam; the ESP32 watches your head tilt with an MPU6050. Either signal alone
sounds the buzzer.

```
  Laptop                                    ESP32
  ┌──────────────────────────┐              ┌────────────────────────┐
  │ webcam → MediaPipe       │   MQTT       │ MPU6050 → pitch angle  │
  │   → EAR → PERCLOS(60s)   │─────────────▶│ subscribes eye verdict │
  │   → "DROWSY"/"NORMAL"    │ drowsiness/  │ either drowsy → buzzer │
  │ Mosquitto broker here    │    eyes      │ (GPIO5, low = ON)      │
  └──────────────────────────┘              └────────────────────────┘
```

## Status

| # | Task | State |
|---|---|---|
| 1 | WiFi SSID / password / laptop IP filled in | ✅ done — `MQTT_HOST = 10.239.24.40` on `Ishwari` |
| 2 | Mosquitto installed & running | ✅ done — listening on `0.0.0.0:1883` |
| 3 | ESP32 sketch uploaded, serial verified | ✅ **uploaded; MPU up, WiFi up, MQTT up** |
| 4 | Python script + webcam verified | ✅ pipeline verified headlessly; run it for the live window |
| 5 | Both alert paths tested independently | ✅ **BOTH PROVEN end-to-end, buzzer audible on each** |
| 6 | Four thresholds tuned | 🟡 EAR validated by measurement; tilt 30°/1.5 s confirmed reachable (peak 43.6°) |
| 7 | Fallback demo plan | ✅ written, below |

**All hardware faults are closed.** Verified: sketch compiles clean for ESP32
Dev Module (70 % flash, 14 % RAM, zero warnings); uploaded to COM5 (CH340),
hash verified; buzzer correctly silent at idle — low-level-trigger logic
confirmed on hardware; IMU detected on **6/6 consecutive boots**; camera opens
at 640×480 / **29 fps**; MediaPipe produces correct EAR values; MQTT round trip
and retained-message behaviour both verified against the live broker.

Both paths, proven on hardware:

- **Eye path** — `mosquitto_pub DROWSY` → `[MQTT] eyes -> DROWSY` → `[BUZZER] ON`, and back.
- **Tilt path** — board tilted to **43.6°**, held → `[TILT] DROWSY` → `[BUZZER] ON`, released cleanly.

## Eye-alert path — PROVEN END TO END ✅

Verified live, laptop → broker → ESP32 → buzzer, with the MPU6050 still
disconnected:

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

This is also your **manual override for the live demo** — if eye detection
struggles under the room's lighting, those two `mosquitto_pub` commands drive
the buzzer directly. Keep them in a text file ready to paste.

## Resolved faults

`tools/Diagnostics/Diagnostics.ino` re-tests I2C, WiFi scan and WiFi connect
with real reason codes. `tools/MpuProbe/MpuProbe.ino` isolates IMU problems
specifically — bus scan, WHO_AM_I, library verdict, and a raw accelerometer
readback. The **main sketch is currently on the board**.

### A. MPU6050 "not found" — RESOLVED ✅ (it was never broken)

Two separate causes, found in this order.

**A1. The default I2C pins did not work on this build.** Moving the bus from
GPIO21/22 to **GPIO32/33** made the module answer immediately. GPIO32/33 are
plain I/O (ADC1, RTC domain), not strapping pins, and the optional 32.768 kHz
crystal that would share them is not populated on this board.

**A2. The module is an MPU6500 clone, and the library rejected it.** After the
rewire the bus scan found `0x68`, yet `Adafruit_MPU6050::begin()` still
returned false. `MpuProbe` showed why:

```
   ACK at 0x68
   addr 0x68 -> WHO_AM_I = 0x70  (MPU6500 clone)
   Adafruit_MPU6050::begin(0x68) returned FALSE
   ax=16176 ay=64 az=-1672   |a|=16262     <- sensor works perfectly (1g)
```

`Adafruit_MPU6050::begin()` rejects any chip whose `WHO_AM_I` is not exactly
`0x68`. Ours reports `0x70` — an MPU6500 die sold as an MPU6050, which is what
most cheap modules are now. The accelerometer data was correct the whole time.

**Fix:** the sketch now talks to the IMU with direct register access instead of
the Adafruit library. The registers are identical across MPU6050/6500/9250, so
it works with a genuine part too, and **two library dependencies are gone**.
A replacement module would not have helped.

> Don't reintroduce `Adafruit_MPU6050` here. It will reject this module again.

### B. Intermittent `[MPU] NOT FOUND` after reset — RESOLVED ✅

Identical firmware found the chip on one boot and not the next. Cause: an ESP32
reset (upload RTS pulse, or the EN button) mid-I2C-byte leaves the IMU holding
SDA low waiting for clocks that never arrive, so every later transaction fails.

**Fix:** `i2cBusRecover()` runs before `Wire.begin()` on every boot — nine
manual SCL pulses to let the slave finish its byte, then a STOP condition. Plus
ten retries on the address probe. Result: **IMU detected on 6/6 boots.**

### C. Tilt threshold unreachable in one direction — RESOLVED ✅

The old code compared *pitch angles*, and `pitch = atan2(-ax, hypot(ay,az))`
saturates at ±90°. This module sits at a resting pitch of about **−85°**, right
at that limit, so tilting one way could only move the reading ~5° before it
folded back — a 30° threshold was impossible to reach in that direction.

**Fix:** tilt is now the **angle between the current gravity vector and the
resting one**, `acos((a·base)/(|a||base|))`. That runs 0–180° with no dead zone
at any mounting orientation. Confirmed by test: peak deviation **43.6°**,
`[TILT] DROWSY` latched, buzzer sounded.

### D. Tilt alert had no hysteresis — RESOLVED ✅

The eye path had a release margin; the tilt path released the instant deviation
crossed back under 30°. After a test the board came to rest at **28.4°** — 1.6°
from flipping state on a nudge, i.e. a chattering buzzer.

**Fix:** `TILT_RELEASE_MARGIN = 5.0`. Arming still needs a continuous 1.5 s
above 30°; clearing now needs a drop below 25°. Between the two it holds state.

### E. WiFi — RESOLVED ✅

The ESP32 connects on the first attempt:

```
[WiFi] connected, ESP32 IP = 10.239.24.248
```

**What it was:** the hotspot was full. `reason=5` (`ASSOC_TOOMANY`) means the
AP refuses new stations because it already has all it will accept — not a
password problem. A slot freed up and it connected immediately.

> An earlier single run reported `reason=2` (AUTH_EXPIRE), which normally
> *does* mean a wrong password, and sent us chasing the wrong thing. Five
> consistent `reason=5` results across repeated attempts were the trustworthy
> answer. **Never diagnose WiFi from one attempt.**

If it recurs: on the phone, open **Connected devices** and disconnect anything
idle (a TV, tablet, watch — they hold slots while doing nothing), raise
**"Maximum connections"** if the setting exists, and toggle the hotspot off/on
to clear stale entries. This ESP32's MAC is `C8:F0:9E:4C:EE:68`.

### Network path — VERIFIED ✅

Client isolation was the biggest risk flagged for demo day. **It is ruled out** —
MQTT connects and messages flow both ways:

```
[MQTT] connecting to 10.239.24.40... connected
[MQTT] subscribed to drowsiness/eyes
```

Laptop `10.239.24.40` and ESP32 `10.239.24.248` are on the same subnet.

> ⚠️ **Both devices must be on the same 2.4 GHz network.** We lost time to this:
> the laptop had joined a 5 GHz phone hotspot (`192.168.221.x`) while the ESP32
> was on `Ishwari` (`10.239.24.x`). WiFi and MQTT both *looked* fine on each
> device, but they were on different networks entirely. **The ESP32 cannot see
> 5 GHz at all** — if you fall back to a phone hotspot, set its band to 2.4 GHz
> or you will get `reason=201` (NO_AP_FOUND) and waste time on a password
> problem that does not exist.

> The hotspot's device limit is still a live demo risk — your laptop, the
> ESP32, and every phone in the room compete for slots. Before presenting,
> disconnect everything else from the hotspot and confirm both devices are on.

> **`MQTT_HOST` is hard-coded and changes with every network.** Re-check with
> `ipconfig` and reflash after any network switch. Currently `10.239.24.40`.

## Files

| File | What it is |
|---|---|
| `ESP32_Drowsiness/ESP32_Drowsiness.ino` | ESP32 sketch. Must stay in a folder of the same name — Arduino IDE requires that. |
| `laptop_drowsiness_detector.py` | Webcam / EAR / PERCLOS / MQTT publisher. |
| `face_landmarker.task` | MediaPipe face model, 3.7 MB. Already downloaded. Keep it next to the `.py`. |
| `tools/BuzzerTest/` | Is the buzzer active or passive? Diagnostic only. |
| `tools/Diagnostics/` | I2C scan + WiFi scan + WiFi connect with reason codes. |
| `tools/MpuProbe/` | IMU-specific probe: bus scan, WHO_AM_I, library verdict, raw accel readback. Use this first for any IMU problem. |
| `docs/PROJECT_REPORT.md` | Full written report for submission. |
| `docs/PRESENTATION.md` | Slide-by-slide deck content with speaker notes. |

## Hardware wiring

| Component pin | ESP32 pin |
|---|---|
| MPU6050 SDA | GPIO32 |
| MPU6050 SCL | GPIO33 |
| MPU6050 AD0 | GND (fixes I2C address to 0x68) |
| MPU6050 VCC | 3.3V |
| MPU6050 GND | GND |
| Buzzer VCC | 3.3V |
| Buzzer GND | GND |
| Buzzer I/O | **GPIO5** (moved from GPIO4 — see below) |

**The MH-FMD buzzer is low-level trigger: LOW = ON, HIGH = OFF.** The sketch
uses named constants `BUZZER_ON` / `BUZZER_OFF` so this can't get lost in an
edit. `setup()` drives the pin HIGH on its very first line.

> ⚠️ **GPIO4 does not work reliably as an output while WiFi is active — moved
> to GPIO5.** GPIO4 doubles as `ADC2_CH0`, and the ESP32's WiFi radio
> periodically claims the ADC2 channels for RF calibration. Confirmed on this
> exact board: with identical code, the buzzer worked perfectly with WiFi off
> and went silent every single time with WiFi on. Moving the signal wire to
> GPIO5 fixed it. **Never use GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, or 27 for
> anything that must be a clean, always-on digital output** if WiFi is
> running — they're all ADC2. If you ever add another output later, prefer
> GPIO5, 16, 17, 18, 19, or 23.

> A brief chirp at power-on is normal and can't be fully removed. The pin
> floats low during the ESP32's boot ROM, which is before any of our code
> runs. It stops the instant `setup()` starts. Don't chase it as a bug.

> **I2C moved from GPIO21/22 to GPIO32/33.** The ESP32 can route I2C to
> almost any GPIO. GPIO32/33 are plain I/O (ADC1, RTC), not strapping pins,
> and the optional 32.768 kHz crystal that would share them is not populated
> on this board. Rewire the MPU6050's SDA to GPIO32 and SCL to GPIO33.

The breadboard's power rails have **no printed +/- markings** — the rails were
declared by hand. Don't assume standard colour coding if you rewire anything.

---

## Setup

### 1. Python side

Already verified on this laptop: Python 3.14.4, `opencv-python` 5.0.0,
`mediapipe` 1.0.1, `paho-mqtt` 2.1.0, and `face_landmarker.task` present.

> **Note for anyone copying older tutorial code:** mediapipe 1.0 **removed**
> the old `mp.solutions.face_mesh` API. Every pre-2025 EAR tutorial online
> uses it and will crash with `AttributeError: module 'mediapipe' has no
> attribute 'solutions'`. This script uses the current Tasks API
> (`FaceLandmarker`), which is why it needs the `.task` model file.

If you ever need to rebuild the environment:

```powershell
pip install opencv-python mediapipe paho-mqtt numpy
```

And to re-fetch the model:

```powershell
curl.exe -o face_landmarker.task https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
```

### 2. Mosquitto broker — NOT YET INSTALLED, NEEDS YOU

This is the one step that can't be automated: the installer requires
Administrator rights. Open **PowerShell as Administrator** and run:

```powershell
winget install EclipseFoundation.Mosquitto --accept-package-agreements
```

(Version 2.1.2 is what winget offers. A non-elevated attempt fails with
`0x800704c7 : The operation was canceled by the user` — that is the declined
UAC prompt, not a broken package.)

**Then you must edit the config, or the ESP32 cannot connect.** Mosquitto 2.x
defaults to localhost-only and rejects anonymous clients. This is the single
most common failure point in this project. Open
`C:\Program Files\mosquitto\mosquitto.conf` in an **Administrator** editor and
add at the end:

```conf
listener 1883 0.0.0.0
allow_anonymous true
```

Restart it and confirm it's listening on all interfaces, not just 127.0.0.1:

```powershell
Restart-Service mosquitto
netstat -an | Select-String ":1883"     # want 0.0.0.0:1883, not 127.0.0.1:1883
```

Also let it through the firewall (Administrator PowerShell, once):

```powershell
New-NetFirewallRule -DisplayName "Mosquitto 1883" -Direction Inbound -Protocol TCP -LocalPort 1883 -Action Allow
```

### 3. Credentials — DONE

Already filled in `ESP32_Drowsiness.ino`: SSID `Ishwari`, its password, and
`MQTT_HOST = "10.80.106.40"` (this laptop). The Python script talks to
`127.0.0.1` and needs no edit — the broker is on the same machine.

> 🔒 **The WiFi password is now in plaintext in the `.ino`.** That is required
> for the ESP32, but do not push this file to GitHub for the project
> submission without blanking those two lines first.

> ⚠️ **Check ESP32-to-laptop reachability early.** The laptop is on
> `10.80.106.40` with gateway `10.80.106.152` — an unusual layout for a home
> router, which normally sits at `.1`. That pattern often means a shared or
> ISP-managed network, and some of those enable *client isolation*, which
> blocks devices from talking to each other even on the same SSID. The failure
> looks confusing: WiFi connects fine, MQTT then fails forever. The moment the
> ESP32 is flashed, confirm it reaches the broker. If it can't, switch both
> laptop and ESP32 to a phone hotspot (see the fallback plan).
>
> Note the ESP32 must be on the **same** network as the laptop — if the laptop
> is on a 5 GHz band of `Ishwari` and the ESP32 joins a 2.4 GHz band with a
> different subnet, they will not see each other.

---

## Bring-up: test one layer at a time

Don't skip ahead. Each step assumes the one before it passed.

**Step 1 — Buzzer alone.** Before any WiFi. Temporarily put this at the end of
`setup()` and confirm you hear two 200 ms beeps:

```cpp
digitalWrite(BUZZER_PIN, BUZZER_ON);  delay(200);
digitalWrite(BUZZER_PIN, BUZZER_OFF); delay(200);
digitalWrite(BUZZER_PIN, BUZZER_ON);  delay(200);
digitalWrite(BUZZER_PIN, BUZZER_OFF);
```

If it's silent, or on constantly, the inversion is wrong somewhere. Remove
this block once it passes.

**Step 2 — MPU6050 alone.** Upload as-is, open Serial Monitor at **115200**.
You want `[MPU] found at 0x68`. If you get `NOT FOUND`, it's wiring: check
SDA=GPIO32, SCL=GPIO33, AD0→GND, VCC→**3.3V not 5V**.

Then watch the once-a-second status line and tilt the board by hand:

```
wifi=up mqtt=DOWN pitch=-2.3 dev=1.8 eyes=normal tilt=normal buzzer=off
```

`dev` should climb as you tilt. Hold it past 30° for 1.5 s → `tilt=DROWSY` and
the buzzer sounds. **This path needs no network at all** — it's your fallback.

**Step 3 — WiFi.** Same Serial Monitor. Want `[WiFi] connected, ESP32 IP = …`.
If it stalls, check the SSID is 2.4 GHz — **the ESP32 cannot see 5 GHz networks.**

**Step 4 — MQTT.** Want `[MQTT] connected` then `[MQTT] subscribed`. If you get
`rc=-2`, the ESP32 can't reach the broker: wrong IP, Mosquitto not listening on
`0.0.0.0`, firewall, or client isolation. Prove the broker works from the
laptop first:

```powershell
# terminal 1
& "C:\Program Files\mosquitto\mosquitto_sub.exe" -h localhost -t "drowsiness/eyes" -v
# terminal 2 — the ESP32 should buzz on this
& "C:\Program Files\mosquitto\mosquitto_pub.exe" -h localhost -t "drowsiness/eyes" -m "DROWSY"
```

That last command is also a great manual override during a live demo.

**Step 5 — Camera.** `python laptop_drowsiness_detector.py`. Window opens with
green dots on your eyes and a live EAR readout. Close Zoom/Teams first — they
lock the webcam.

**Step 6 — Both paths, independently.**
- Cover the camera, tilt the board → buzzer (ESP32's own MPU6050).
- Hold the board level, close your eyes → buzzer (via MQTT from the laptop).

Testing them separately is what tells you *which* half broke when something
does.

---

## Tuning the four values

PERCLOS needs a full 60 s of data before it means anything — the overlay shows
`window filling …%` until then. Don't judge it early.

**`EAR_THRESHOLD` (currently 0.22).** *Already measured on this laptop's
webcam:* open-eye EAR came out at **0.260 (right eye) / 0.298 (left)**. So 0.22
sits at roughly 78 % of your open value — a good starting point, keep it.

Press **`c`** with your eyes open to re-measure any time; the terminal prints
your open-eye EAR and suggests a threshold at 75 % of it. Watch the readout: it
should sit clearly above the threshold when open and drop well below when
closed. If it barely moves, add light in *front* of your face, not behind you.

> Measured eye width was only ~30 px at 640×480. That's a small, noisy target —
> **sit closer to the laptop** than you might expect to for the demo. Wider eyes
> in frame means a much steadier EAR.

**`PERCLOS_THRESHOLD` (0.30).** Fraction of the last 60 s spent with eyes
closed. Normal blinking lands around 0.03–0.07, so 0.30 is deliberately far
above it — a real microsleep is needed to trip it. **For a live demo 0.30 means
roughly 18 s of eyes-closed out of 60 s, which is a long time to stand there.**
Consider dropping `PERCLOS_WINDOW_S` to 15 for the demo so it reacts in a few
seconds, and say so in your presentation — a shorter window is a legitimate
design choice, just be ready to explain the tradeoff (faster reaction, more
false positives).

**`TILT_ANGLE_THRESHOLD` (30°).** The **angle between** the current gravity
vector and the resting pose captured at boot — not a difference of pitch
angles, and not an absolute angle. Range is a clean 0–180° at any mounting
orientation, with no dead zone. *Measured:* idle noise is `dev = 0.0–0.3`, and
a deliberate tilt reached **43.6°**, so 30° has large margin on both sides.

**Keep the board still for the first ~2 s after reset** — that is when it
averages 100 samples to capture the resting pose. Reset it *in the position it
will sit during the demo*; if the baseline is captured while tilted, that
tilted pose becomes "normal" and `dev` will read high at rest.

**`TILT_HOLD_MS` (1500).** How long the tilt must persist before alerting.
Lower → twitchier; higher → slower but more convincing. 1500 is a good demo
value.

**`TILT_RELEASE_MARGIN` (5°).** Hysteresis. Arming needs a continuous 1.5 s
above 30°; clearing needs a drop below 25°. Between the two the state holds, so
a board resting near the threshold cannot make the buzzer chatter.

---

## Fallback plan for demo day

Ranked most to least preferred. Have the later ones ready before you present.

1. **Full system**, as designed.
2. **Phone hotspot.** If campus WiFi has client isolation. Requires an
   `ipconfig` on the laptop for the new IP and a reflash — **pre-flash a second
   copy of the sketch with the hotspot IP already in it** so it's a 30 s swap,
   not a live debug.
3. **Tilt-only.** The ESP32 does *not* depend on the network for tilt
   detection — the sketch never blocks on WiFi or MQTT. Even with the laptop
   completely off, tilting the board buzzes. Lead with this half if the network
   dies; it demonstrates real embedded sensing on its own.
4. **Manual MQTT trigger.** Run the Python script for the visuals and fire
   `mosquitto_pub` by hand for the buzzer, if the eye detection misbehaves
   under the room's lighting.
5. **Recorded video.** Record a successful end-to-end run the night before.
   Not a substitute, but far better than a blank screen.

**Things to bring:** a desk lamp (venue lighting is the most common cause of a
failing EAR), a phone with hotspot data, a USB cable, and a fully charged
laptop.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Buzzer on constantly at boot | The pin floats low before `setup()`. Brief chirp is normal; *constant* means the pin isn't being driven HIGH — check `BUZZER_OFF` is still `HIGH`. |
| Buzzer logs `[BUZZER] ON` but makes no sound | If it's on GPIO4, this is the ADC2/WiFi conflict above — move it to GPIO5. |
| `AttributeError: … no attribute 'solutions'` | Old tutorial code. This project uses the Tasks API — see section 1. |
| MQTT `rc=-2` on ESP32 | Broker not on `0.0.0.0`, firewall, wrong IP, or client isolation. |
| `[MPU] NOT FOUND` | Wiring (SDA=32, SCL=33), or MPU6050 on 5V instead of 3.3V. If it worked on the previous boot, it's the stuck-bus case — `i2cBusRecover()` handles it; just reset again. Run `tools/MpuProbe` to see WHO_AM_I and raw data. |
| IMU works in `MpuProbe` but a library says "not found" | Your module is an MPU6500 clone (`WHO_AM_I = 0x70`). Adafruit's library rejects it. The sketch uses direct register access for exactly this reason — don't reintroduce the library. |
| Buzzer chatters on and off | The board is resting near the 30° threshold. Reset it in its final resting pose so the baseline matches; `TILT_RELEASE_MARGIN` covers the rest. |
| `dev=` stuck at ~28 and won't return to 0 | Baseline is stale — it was captured in a different pose. Press EN/reset with the board where it will actually sit. |
| Serial port becomes unresponsive; process won't die | CH340 handle wedged after repeated open/reset cycles. Unplug and replug the USB cable. |
| Camera won't open | Another app holds it. Close Zoom/Teams/Camera. |
| EAR stuck near 0 / `NO FACE` | Too dark, or backlit. Light from the front. |
| Port missing in Arduino IDE | This board is a **CH340**, not CP2102, despite the chip markings. Driver is already installed and working. |
| `LED_BUILTIN` undefined | Not defined for this board profile. Use GPIO2. |
