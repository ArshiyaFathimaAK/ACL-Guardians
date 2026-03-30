import argparse
import json
import time

from serial_reader import SerialAccelerometerReader


def main() -> None:
    parser = argparse.ArgumentParser(description="Read accelerometer data from serial and print JSON.")
    parser.add_argument("--port", default="COM3", help="Serial port (example: COM3)")
    parser.add_argument("--baud", type=int, default=9600, help="Serial baud rate")
    parser.add_argument("--interval", type=float, default=0.5, help="Output interval in seconds")
    args = parser.parse_args()

    reader = SerialAccelerometerReader(port=args.port, baud_rate=args.baud)
    reader.start()

    try:
        while True:
            print(json.dumps(reader.latest(), ensure_ascii=True))
            time.sleep(args.interval)
    except KeyboardInterrupt:
        pass
    finally:
        reader.stop()


if __name__ == "__main__":
    main()
