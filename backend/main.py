import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from serial_reader import SerialAccelerometerReader


SERIAL_PORT = os.getenv("SERIAL_PORT", "COM3")
SERIAL_BAUD_RATE = int(os.getenv("SERIAL_BAUD_RATE", "9600"))

reader = SerialAccelerometerReader(port=SERIAL_PORT, baud_rate=SERIAL_BAUD_RATE)


@asynccontextmanager
async def lifespan(_: FastAPI):
    reader.start()
    yield
    reader.stop()


app = FastAPI(title="Accelerometer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/accelerometer/latest")
def get_latest_accelerometer_data() -> dict[str, Any]:
    return reader.latest()
