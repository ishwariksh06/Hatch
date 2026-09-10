"""
laptop_drowsiness_detector.py
Driver Drowsiness Detection - laptop node.

Watches the built-in webcam, computes the Eye Aspect Ratio (EAR) per frame,
tracks PERCLOS (fraction of the last ~60s with the eyes closed), and publishes
"DROWSY" / "NORMAL" to MQTT whenever the verdict changes.

Run:  python laptop_drowsiness_detector.py
Quit: press q in the video window (or Ctrl+C in the terminal)

Keys while running:
  q  quit
  c  recalibrate: use the current EAR as the "eyes open" reference
  r  reset the PERCLOS window

Requires: opencv-python, mediapipe, paho-mqtt, a local Mosquitto broker,
and face_landmarker.task sitting next to this file.
"""

import collections
import math
import os
import sys
import time

import cv2
import mediapipe as mp
import numpy as np
import paho.mqtt.client as mqtt
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    FaceLandmarker,
    FaceLandmarkerOptions,
    RunningMode,
)

# ---------------------------------------------------------------------------
# Tunables - these are the four values to calibrate against your own face,
# lighting, and camera. See README for how to tune them.
# ---------------------------------------------------------------------------
EAR_THRESHOLD = 0.22       # below this, the eye counts as closed for this frame
PERCLOS_THRESHOLD = 0.30   # fraction of the window closed before we call DROWSY

# Rolling window length in seconds.
#
# The drowsiness literature uses 60 s, and that is the academically defensible
# number - but it makes for a poor live demo: it takes roughly 15 s of eye
# closure to trip, and then 30-40 s of eyes-open before PERCLOS drains back
# under the release line, so the buzzer keeps sounding long after the driver
# has woken up. Measured on this rig: PERCLOS peaked at 0.41 and the alert
# stayed latched for about a minute.
#
# 15 s trips after roughly 5 s of closure and clears about 10 s after the eyes
# open. The trade-off is real and worth stating out loud in the presentation:
# a shorter window reacts faster but is more easily moved by a single long
# blink, so it is more prone to false positives. Set this back to 60.0 if you
# want the textbook figure.
PERCLOS_WINDOW_S = 15.0

# Hysteresis: once DROWSY, PERCLOS must fall this much below the threshold
# before we go back to NORMAL. Stops the buzzer stuttering right at the edge.
PERCLOS_RELEASE_MARGIN = 0.05

# PERCLOS is a ratio over whatever's currently in the window. Right after
# start the window holds only a second or two of data, so one or two frames
# misread as "closed" (camera auto-exposure ramping, a blink, a brief no-face
# flicker) can swing the ratio past the threshold immediately. Require the
# window to be at least half full before PERCLOS is allowed to raise an alert
# - dropping back to NORMAL is always allowed immediately, since that's the
# safe direction.
MIN_COVERAGE_TO_ALERT = 0.5

# ---------------------------------------------------------------------------
# MQTT - the broker is Mosquitto on this same laptop, so localhost is correct
# here. The ESP32 connects to this laptop's LAN IP instead (see README).
# ---------------------------------------------------------------------------
MQTT_HOST = "127.0.0.1"
MQTT_PORT = 1883
TOPIC_EYES = "drowsiness/eyes"

CAMERA_INDEX = 0
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "face_landmarker.task")

# MediaPipe Face Mesh landmark indices for the six EAR points per eye.
# Order: [outer corner, upper lid A, upper lid B, inner corner, lower lid B, lower lid A]
LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]


def eye_aspect_ratio(pts):
    """Classic EAR: (vertical + vertical) / (2 * horizontal).

    Near ~0.3 with the eye open, drops toward ~0.1 when it closes. Because it
    is a *ratio*, it stays roughly stable as you move nearer to or further
    from the camera - that is the whole reason this metric is used.
    """
    p1, p2, p3, p4, p5, p6 = pts
    vert = np.linalg.norm(p2 - p6) + np.linalg.norm(p3 - p5)
    horiz = np.linalg.norm(p1 - p4)
    if horiz < 1e-6:
        return 0.0
    return vert / (2.0 * horiz)


class PerclosTracker:
    """Rolling-window PERCLOS: what fraction of the last N seconds was closed.

    Each frame contributes its own duration, so the result stays correct even
    if the frame rate wobbles - which it will, on a laptop webcam.
    """

    def __init__(self, window_s):
        self.window_s = window_s
        self.samples = collections.deque()  # (timestamp, duration, closed)

    def add(self, now, dt, closed):
        self.samples.append((now, dt, closed))
        cutoff = now - self.window_s
        while self.samples and self.samples[0][0] < cutoff:
            self.samples.popleft()

    def value(self):
        total = sum(s[1] for s in self.samples)
        if total <= 0:
            return 0.0
        closed = sum(s[1] for s in self.samples if s[2])
        return closed / total

    def coverage(self):
        """How full the window is, 0..1. PERCLOS is not trustworthy until
        this is near 1.0 - that takes PERCLOS_WINDOW_S seconds after start."""
        total = sum(s[1] for s in self.samples)
        return min(total / self.window_s, 1.0)

    def reset(self):
        self.samples.clear()


def make_mqtt_client():
    # paho-mqtt 2.x requires the callback API version explicitly.
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2,
                         client_id="laptop-drowsiness-detector")

    # Last will: if this script crashes or the laptop drops off the network,
    # the broker publishes NORMAL on our behalf so the ESP32's buzzer cannot
    # get stuck on. Safe-direction failure, which matters during a live demo.
    client.will_set(TOPIC_EYES, "NORMAL", qos=1, retain=True)

    def on_connect(c, userdata, flags, rc, properties=None):
        if rc == 0:
            print(f"[MQTT] connected to {MQTT_HOST}:{MQTT_PORT}")
        else:
            print(f"[MQTT] connect failed, rc={rc}")

    def on_disconnect(c, userdata, flags, rc, properties=None):
        print(f"[MQTT] disconnected (rc={rc}), will auto-reconnect")

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect

    try:
        client.connect(MQTT_HOST, MQTT_PORT, keepalive=15)
    except OSError as e:
        print(f"[MQTT] could not reach the broker at {MQTT_HOST}:{MQTT_PORT}: {e}")
        print("[MQTT] is Mosquitto running? See README section 2.")
        print("[MQTT] continuing anyway - the video window still works for tuning.")
    client.loop_start()   # background thread handles reconnects for us
    return client


def main():
    if not os.path.exists(MODEL_PATH):
        sys.exit(f"Missing model file: {MODEL_PATH}\n"
                 "Download face_landmarker.task - see README section 1.")

    options = FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=RunningMode.VIDEO,
        num_faces=1,
    )

    client = make_mqtt_client()

    cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)   # DSHOW: fast open on Windows
    if not cap.isOpened():
        sys.exit(f"Could not open camera {CAMERA_INDEX}. "
                 "Close Teams/Zoom/Camera app and try again.")

    perclos = PerclosTracker(PERCLOS_WINDOW_S)
    state = "NORMAL"
    ear_open_reference = None     # set by pressing 'c'
    last_t = time.time()
    t_start = last_t
    last_ts_ms = -1

    # Publish our starting state, retained, so an ESP32 that connects later
    # immediately learns the current verdict instead of waiting for a change.
    client.publish(TOPIC_EYES, state, qos=1, retain=True)
    last_published = state
    print(f"[STATE] {state} (initial)")
    print("Press 'c' to calibrate on your open eyes, 'r' to reset, 'q' to quit.")

    with FaceLandmarker.create_from_options(options) as landmarker:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("[CAM] dropped frame")
                continue

            frame = cv2.flip(frame, 1)          # mirror, feels natural on screen
            h, w = frame.shape[:2]
            now = time.time()
            dt = min(now - last_t, 0.5)         # cap dt so a hitch can't skew PERCLOS
            last_t = now

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            # VIDEO mode needs a strictly increasing timestamp in ms. Use real
            # elapsed time, not an assumed frame rate - this webcam runs about
            # 17 fps, and feeding a wrong rate degrades MediaPipe's frame-to-
            # frame tracking. The max() guards against two frames landing in
            # the same millisecond, which would not be strictly increasing.
            ts_ms = max(int((now - t_start) * 1000), last_ts_ms + 1)
            last_ts_ms = ts_ms
            result = landmarker.detect_for_video(mp_image, ts_ms)

            ear = None
            face_found = bool(result.face_landmarks)

            if face_found:
                lm = result.face_landmarks[0]
                pts = np.array([[p.x * w, p.y * h] for p in lm], dtype=np.float32)
                left = eye_aspect_ratio(pts[LEFT_EYE])
                right = eye_aspect_ratio(pts[RIGHT_EYE])
                ear = (left + right) / 2.0

                for idx in LEFT_EYE + RIGHT_EYE:
                    cv2.circle(frame, tuple(pts[idx].astype(int)), 2, (0, 255, 0), -1)

            # No face = we cannot say the eyes are closed. Count it as open so a
            # driver who turns their head does not silently accumulate PERCLOS.
            closed = bool(ear is not None and ear < EAR_THRESHOLD)
            perclos.add(now, dt, closed)
            p = perclos.value()

            # State machine with hysteresis. Alerting requires the window to
            # be reasonably full first - see MIN_COVERAGE_TO_ALERT above.
            if (state == "NORMAL" and p >= PERCLOS_THRESHOLD
                    and perclos.coverage() >= MIN_COVERAGE_TO_ALERT):
                state = "DROWSY"
            elif state == "DROWSY" and p < PERCLOS_THRESHOLD - PERCLOS_RELEASE_MARGIN:
                state = "NORMAL"

            # Publish only on change, retained so late subscribers stay correct.
            if state != last_published:
                last_published = state
                client.publish(TOPIC_EYES, state, qos=1, retain=True)
                print(f"[STATE] -> {state}   (PERCLOS {p:.2f})")

            # ---------------- overlay ----------------
            colour = (0, 0, 255) if state == "DROWSY" else (0, 200, 0)
            cv2.rectangle(frame, (0, 0), (w, 96), (0, 0, 0), -1)
            cv2.putText(frame, f"EAR {ear:.3f}" if ear is not None else "EAR --",
                        (12, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, f"PERCLOS {p:.2f} / {PERCLOS_THRESHOLD:.2f}",
                        (12, 58), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, state, (12, 86),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, colour, 2)

            if not face_found:
                cv2.putText(frame, "NO FACE", (w - 150, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)
            if closed:
                cv2.putText(frame, "EYES CLOSED", (w - 220, 58),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

            cov = perclos.coverage()
            if cov < MIN_COVERAGE_TO_ALERT:
                cv2.putText(frame, f"window filling {cov*100:.0f}% - alerts armed at "
                            f"{MIN_COVERAGE_TO_ALERT*100:.0f}%", (12, h - 16),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
            elif cov < 0.99:
                cv2.putText(frame, f"window filling {cov*100:.0f}%", (12, h - 16),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
            if ear_open_reference is not None:
                cv2.putText(frame,
                            f"open ref {ear_open_reference:.3f} -> suggest {ear_open_reference*0.75:.3f}",
                            (w - 430, h - 16), cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                            (200, 200, 200), 1)

            cv2.imshow("Drowsiness Detector  [q]uit  [c]alibrate  [r]eset", frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('c') and ear is not None:
                ear_open_reference = ear
                print(f"[CAL] open-eye EAR = {ear:.3f}  ->  "
                      f"try EAR_THRESHOLD = {ear * 0.75:.3f}")
            elif key == ord('r'):
                perclos.reset()
                print("[CAL] PERCLOS window reset")

    cap.release()
    cv2.destroyAllWindows()
    client.publish(TOPIC_EYES, "NORMAL", qos=1, retain=True)
    time.sleep(0.3)          # let that last publish flush before we tear down
    client.loop_stop()
    client.disconnect()
    print("Stopped cleanly, published NORMAL on the way out.")


if __name__ == "__main__":
    main()
