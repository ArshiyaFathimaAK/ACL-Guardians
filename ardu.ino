#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL343.h>

#define LED_PIN 9
#define BUZZER_PIN 8

// Create two ADXL343 objects with different I2C addresses
Adafruit_ADXL343 accel1 = Adafruit_ADXL343(12345); // ACC1, SDO->GND, addr=0x53
Adafruit_ADXL343 accel2 = Adafruit_ADXL343(54321); // ACC2, SDO->VCC, addr=0x1D

// Thresholds (adjust after testing)
#define REST_Z_MIN -2 
#define REST_Z_MAX 2
#define GOOD_SQUAT_Z_MIN 4
#define GOOD_SQUAT_Z_MAX 8
#define BAD_SQUAT_Z_MAX 3

unsigned long lastBlinkMs = 0;
bool blinkOn = false;
const char *prevState = "rest";

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Initialize first accelerometer
  if (!accel1.begin(0x53)) {
    Serial.println("Error: ACC1 not found!");
    while (1);
  }
  accel1.setRange(ADXL343_RANGE_16_G);

  // Initialize second accelerometer
  if (!accel2.begin(0x1D)) {
    Serial.println("Error: ACC2 not found!");
    while (1);
  }
  accel2.setRange(ADXL343_RANGE_16_G);

  Serial.println("Both ADXL343 sensors ready!");
}

void loop() {
  sensors_event_t event1, event2;
  accel1.getEvent(&event1);
  accel2.getEvent(&event2);

  float z1 = event1.acceleration.z; // e.g., above knee
  float z2 = event2.acceleration.z; // e.g., below knee

  const char *state = "warning";

  // Example logic: both must be in GOOD range for a good squat
  if ((z1 >= GOOD_SQUAT_Z_MIN && z1 <= GOOD_SQUAT_Z_MAX) &&
      (z2 >= GOOD_SQUAT_Z_MIN && z2 <= GOOD_SQUAT_Z_MAX)) {
    digitalWrite(LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, LOW);
    state = "good";
  } 
  else if ((z1 < BAD_SQUAT_Z_MAX) || (z2 < BAD_SQUAT_Z_MAX)) {
    // Bad squat → blink
    unsigned long now = millis();
    if (now - lastBlinkMs >= 120) {
      blinkOn = !blinkOn;
      lastBlinkMs = now;
    }
    digitalWrite(LED_PIN, blinkOn ? HIGH : LOW);
    digitalWrite(BUZZER_PIN, blinkOn ? HIGH : LOW);
    state = "bad";
  } 
  else if ((z1 >= REST_Z_MIN && z1 <= REST_Z_MAX) &&
           (z2 >= REST_Z_MIN && z2 <= REST_Z_MAX)) {
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    state = "rest";
  } 
  else {
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    state = "warning";
  }

  prevState = state;

  // Serial output for debugging / backend
  Serial.print("{\"state\":\"");
  Serial.print(state);
  Serial.print("\",\"accel1_z\":");
  Serial.print(z1, 2);
  Serial.print(",\"accel2_z\":");
  Serial.print(z2, 2);
  Serial.println("}");

  delay(100); // 10 Hz loop
}
