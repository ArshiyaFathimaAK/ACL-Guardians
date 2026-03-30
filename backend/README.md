# Backend Setup

## 1) Install Python dependencies

```powershell
python -m pip install -r requirements.txt
```

## 2) Read serial data as structured JSON (standalone)

```powershell
python read_serial.py --port COM3 --baud 9600
```

The script parses lines like:

```text
X: 0.12 | Y: -0.34 | Z: 9.76
```

and outputs JSON with computed angles (`pitch`, `roll`, `tilt`).

## 3) Run FastAPI server

```powershell
$env:SERIAL_PORT = "COM3"
$env:SERIAL_BAUD_RATE = "9600"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API endpoints

- `GET /api/health`
- `GET /api/accelerometer/latest`

Example response:

```json
{
  "status": "ok",
  "port": "COM3",
  "timestamp": "2026-03-28T19:00:00.000000+00:00",
  "accelerometer": {
    "x": 0.12,
    "y": -0.34,
    "z": 9.76,
    "magnitude": 9.77
  },
  "angles": {
    "pitch": 0.7,
    "roll": -2.0,
    "tilt": 2.1
  },
  "raw": "X: 0.12 | Y: -0.34 | Z: 9.76"
}
```
