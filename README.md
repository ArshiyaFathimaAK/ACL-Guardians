
# 🦵 Smart Knee Posture Monitor for Women

## 📌 Overview

The **Smart Knee Posture Monitor** is a wearable system designed to **prevent knee injuries in women** through real-time posture detection and feedback.

It combines **hardware sensors + a companion app** to monitor knee alignment, detect unsafe movement patterns, and alert users instantly.

---

## 🚨 The Problem: Women Are at Higher Risk

* Women are **2–8× more likely** to tear their ACL
* **26.1% of pregnant women** report severe knee dysfunction
* Up to **62.6% of women in the third trimester** experience knee pain

### Why?

* Wider hip structure → increased knee valgus (inward collapse)
* Hormonal effects (e.g., relaxin) → ligament laxity
* Pregnancy:

  * Weight gain
  * Postural shifts
  * Joint instability
  * Swelling and pressure changes

💡 Most current solutions are **reactive (after injury)** — not preventive.

---

## 💡 Our Solution

A **wearable knee monitoring system** that:

* Tracks knee motion and alignment in real time
* Detects unsafe posture before injury occurs
* Provides **instant feedback** through LED + buzzer
* Syncs with a **mobile app** for tracking and analysis

---

## ⚙️ Hardware Components

* **2 × ADXL343 Accelerometers**

  * Placed **above and below the knee**
  * Track knee angle and movement

* **Load Sensors**

  * Detect **pressure changes / swelling around the knee**

* **LED Indicator**

  * Visual feedback for posture (accessible for deaf users)

* **Buzzer**

  * Audio feedback for posture (accessible for blind users)

* *(Optional / Future)*

  * Servo motor for corrective feedback
  * Additional pressure sensors
  * Heart rate monitor

---

## 🧠 System Functionality

### Real-Time Detection

The system continuously classifies movement into:

* ✅ **Good posture** → LED ON
* ⚠️ **Bad posture** → LED blinks + buzzer alerts
* 💤 **Rest state** → No alerts

### Data Tracking

* Sensor data is sent to the **mobile app**
* Tracks:

  * Knee angle/orientation
  * Movement patterns
  * Posture history

---

## 📱 Mobile App

The companion app:

* Stores and visualizes **sensor data**
* Tracks **user posture over time**
* Helps identify patterns and risks
* Can be extended for:

  * Cycle-based tracking (muscle stability variations)
  * Pregnancy-safe activity monitoring

---

## 👩‍⚕️ Target Users

### 🤰 Pregnant Women

* Prevent excessive strain on knees
* Monitor posture during daily activities
* Reduce risk of long-term joint issues

### 🏃‍♀️ Athletes & Active Women

* Improve squat and movement form
* Prevent ACL injuries
* Enhance training safety

### 👩 General Users

* Detect posture issues during daily tasks
* Adapt to **menstrual cycle variations** affecting muscle stability

---

## 🌍 Real-World Impact

* Prevents injuries **before they happen**
* Reduces long-term healthcare costs
* Supports **safe movement for women across life stages**
* Simple, wearable, and easy to integrate into daily life

---

## ♿ Accessibility & Inclusivity

* LED → visual alerts for **deaf users**
* Buzzer → audio alerts for **blind users**
* Designed for:

  * Different physical conditions
  * Everyday usability
  * Affordable implementation

---

## 📈 Scalability & Future Work

* Add more sensors for full-body posture tracking
* Integrate AI for predictive injury detection
* Expand app with:

  * Personalized recommendations
  * Cycle-aware insights
  * Pregnancy-safe workout guidance

---

## 🔬 Technical Highlights

* Dual accelerometer I2C integration (address-based)
* Non-blocking real-time feedback system
* Modular and scalable hardware design
* JSON-based data output for backend/app integration

---

## 📚 References

* Northwestern Medicine. *Why women have more ACL injuries than men*, Nov. 2023
* The female ACL: Why is it more prone to injury? Journal of Orthopaedics, 2016
* Lindberg, S. (2020). *All about joint pain during pregnancy*. Healthline

---

## 🏁 Conclusion

This project shifts knee health from **reactive treatment → proactive prevention**, with a strong focus on **women’s biomechanics, pregnancy safety, and accessibility**.

---

