#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL343.h>
#include <string.h>

#define LED_PIN 9
#define BUZZER_PIN 10

// Above knee (SDO -> GND => 0x53), below knee (SDO -> VCC => 0x1D)
Adafruit_ADXL343 accelAbove = Adafruit_ADXL343(12345);
Adafruit_ADXL343 accelBelow = Adafruit_ADXL343(54321);

// Thresholds used by both firmware and app.
const float GOOD_Y2_MAX = 5.0;
const float BAD_Y2_MIN = 7.0;

unsigned long lastBadPulseMs = 0;
bool badPulseOn = false;
const char *previousState = "good";

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  if (!accelAbove.begin(0x53)) {
    Serial.println("{\"status\":\"error\",\"message\":\"ACC_ABOVE not found\"}");
    while (1) {
    }
  }
  accelAbove.setRange(ADXL343_RANGE_16_G);

  if (!accelBelow.begin(0x1D)) {
    Serial.println("{\"status\":\"error\",\"message\":\"ACC_BELOW not found\"}");
    while (1) {
    }
  }
  accelBelow.setRange(ADXL343_RANGE_16_G);

  Serial.println("{\"status\":\"ready\",\"sensor\":\"ADXL343_dual\"}");
}

void loop() {
  sensors_event_t upperEvent, lowerEvent;
  accelAbove.getEvent(&upperEvent);
  accelBelow.getEvent(&lowerEvent);

  float x1 = upperEvent.acceleration.x;
  float y1 = upperEvent.acceleration.y;
  float z1 = upperEvent.acceleration.z;

  float x2 = lowerEvent.acceleration.x;
  float y2 = lowerEvent.acceleration.y;
  float z2 = lowerEvent.acceleration.z;

  float diff = y2 - y1;

  const char *state = "warning";

  if (y2 <= GOOD_Y2_MAX) {
    state = "good";
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  } else if (y2 >= BAD_Y2_MIN) {
    state = "bad";

    unsigned long now = millis();
    if (now - lastBadPulseMs >= 120) {
      badPulseOn = !badPulseOn;
      lastBadPulseMs = now;
    }

    digitalWrite(LED_PIN, badPulseOn ? HIGH : LOW);
    digitalWrite(BUZZER_PIN, badPulseOn ? HIGH : LOW);
  } else {
    state = "warning";
    digitalWrite(LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, LOW);
  }

  // Single short warning beep only when entering warning state.
  if (strcmp(state, "warning") == 0 && strcmp(previousState, "warning") != 0) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(80);
    digitalWrite(BUZZER_PIN, LOW);
  }

  previousState = state;

  // Structured JSON line for backend/app.
  Serial.print("{\"status\":\"ok\",\"sensor\":\"ADXL343_dual\",\"state\":\"");
  Serial.print(state);
  Serial.print("\",\"t_ms\":");
  Serial.print(millis());

  Serial.print(",\"accelerometer\":{\"x\":");
  Serial.print(x2, 4);
  Serial.print(",\"y\":");
  Serial.print(y2, 4);
  Serial.print(",\"z\":");
  Serial.print(z2, 4);
  Serial.print("}");

  Serial.print(",\"knee\":{\"x1\":");
  Serial.print(x1, 4);
  Serial.print(",\"y1\":");
  Serial.print(y1, 4);
  Serial.print(",\"z1\":");
  Serial.print(z1, 4);
  Serial.print(",\"x2\":");
  Serial.print(x2, 4);
  Serial.print(",\"y2\":");
  Serial.print(y2, 4);
  Serial.print(",\"z2\":");
  Serial.print(z2, 4);
  Serial.print(",\"diff\":");
  Serial.print(diff, 4);
  Serial.print("}");

  Serial.print(",\"thresholds\":{\"goodY2Max\":");
  Serial.print(GOOD_Y2_MAX, 2);
  Serial.print(",\"badY2Min\":");
  Serial.print(BAD_Y2_MIN, 2);
  Serial.print("}}");

  Serial.println();
  delay(100);
}
