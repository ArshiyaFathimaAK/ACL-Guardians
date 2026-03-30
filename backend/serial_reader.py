import math
import json
import re
import threading
import time
from datetime import datetime, timezone
from typing import Any

import serial


# Matches Arduino output format: X: <num> | Y: <num> | Z: <num>
LINE_PATTERN = re.compile(
    r"X:\s*(-?\d+(?:\.\d+)?)\s*\|\s*Y:\s*(-?\d+(?:\.\d+)?)\s*\|\s*Z:\s*(-?\d+(?:\.\d+)?)"
)


class SerialAccelerometerReader:
    def __init__(self, port: str, baud_rate: int = 9600, timeout: float = 1.0) -> None:
        self.port = port
        self.baud_rate = baud_rate
        self.timeout = timeout

        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()

        self._latest: dict[str, Any] = {
            "status": "waiting",
            "message": "No accelerometer sample received yet",
        }

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        self._stop_event.clear()
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)

    def latest(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._latest)

    def _set_latest(self, payload: dict[str, Any]) -> None:
        with self._lock:
            self._latest = payload

    def _read_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                with serial.Serial(self.port, self.baud_rate, timeout=self.timeout) as ser:
                    # Give board a moment right after opening the port.
                    time.sleep(2)
                    while not self._stop_event.is_set():
                        line = ser.readline().decode("utf-8", errors="ignore").strip()
                        if not line:
                            continue

                        parsed = self._parse_line(line)
                        if parsed is not None:
                            self._set_latest(parsed)
            except Exception as exc:  # noqa: BLE001
                self._set_latest(
                    {
                        "status": "error",
                        "message": f"Serial read error: {exc}",
                        "port": self.port,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )
                # Retry serial connection.
                time.sleep(2)

    def _parse_line(self, line: str) -> dict[str, Any] | None:
        parsed_format = "legacy"
        state: str | None = None
        thresholds: dict[str, float] | None = None
        knee: dict[str, float] | None = None

        parsed_json = self._try_parse_json_line(line)
        if parsed_json is not None:
            x, y, z, state, thresholds, knee = parsed_json
            parsed_format = "json"
        else:
            match = LINE_PATTERN.search(line)
            if not match:
                return None
            x, y, z = (float(match.group(i)) for i in range(1, 4))

        magnitude = math.sqrt((x * x) + (y * y) + (z * z))
        pitch = math.degrees(math.atan2(x, math.sqrt((y * y) + (z * z))))
        roll = math.degrees(math.atan2(y, math.sqrt((x * x) + (z * z))))

        tilt = None
        if magnitude > 0:
            ratio = max(-1.0, min(1.0, z / magnitude))
            tilt = math.degrees(math.acos(ratio))

        return {
            "status": "ok",
            "port": self.port,
            "format": parsed_format,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "accelerometer": {
                "x": round(x, 4),
                "y": round(y, 4),
                "z": round(z, 4),
                "magnitude": round(magnitude, 4),
            },
            "angles": {
                "pitch": round(pitch, 2),
                "roll": round(roll, 2),
                "tilt": round(tilt, 2) if tilt is not None else None,
            },
            "state": state,
            "thresholds": thresholds,
            "knee": knee,
            "raw": line,
        }

    @staticmethod
    def _to_float(value: Any) -> float | None:
        if isinstance(value, (int, float)):
            return float(value)

        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                return None

        return None

    def _try_parse_json_line(
        self, line: str
    ) -> tuple[float, float, float, str | None, dict[str, float] | None, dict[str, float] | None] | None:
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            return None

        if not isinstance(payload, dict):
            return None

        accel = payload.get("accelerometer")
        if not isinstance(accel, dict):
            # Allow flat JSON as fallback: {"x":...,"y":...,"z":...}
            accel = payload

        x = self._to_float(accel.get("x"))
        y = self._to_float(accel.get("y"))
        z = self._to_float(accel.get("z"))

        if x is None or y is None or z is None:
            return None

        state = payload.get("state")

        thresholds_payload = payload.get("thresholds")
        parsed_thresholds: dict[str, float] | None = None
        if isinstance(thresholds_payload, dict):
            good_y2_max = self._to_float(thresholds_payload.get("goodY2Max"))
            bad_y2_min = self._to_float(thresholds_payload.get("badY2Min"))
            if good_y2_max is not None and bad_y2_min is not None:
                parsed_thresholds = {
                    "goodY2Max": round(good_y2_max, 4),
                    "badY2Min": round(bad_y2_min, 4),
                }

        knee_payload = payload.get("knee")
        parsed_knee: dict[str, float] | None = None
        if isinstance(knee_payload, dict):
            parsed_knee = {}
            for key in ("x1", "y1", "z1", "x2", "y2", "z2", "diff"):
                value = self._to_float(knee_payload.get(key))
                if value is not None:
                    parsed_knee[key] = round(value, 4)
            if not parsed_knee:
                parsed_knee = None

        return (
            x,
            y,
            z,
            state if isinstance(state, str) else None,
            parsed_thresholds,
            parsed_knee,
        )
