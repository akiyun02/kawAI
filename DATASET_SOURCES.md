# ASL Fingerspelling Dataset Sources & Attribution
### *SIGNQUEST Computer Vision & Landmark Recognition Data Governance*

This document records the data sources, licenses, and attribution requirements used for training, benchmarking, and validating the ASL fingerspelling recognition engine in **SIGNQUEST**.

---

## 1. Google — Isolated Sign Language Recognition (GISLR)
- **Source**: [Kaggle: Google — Isolated Sign Language Recognition](https://www.kaggle.com/competitions/asl-signs/data)
- **Publisher**: Google, in collaboration with the Deaf Professional Arts Network (DPAN) and the Hearing, Speech & Deaf Center (HSDC).
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0) / Competition Dataset Agreement.
- **Data Description**: Over 100,000 isolated sign recordings captured across 21 signers with MediaPipe 21 hand landmarks, 33 pose landmarks, and 468 face landmarks stored as parquet sequences.
- **Attribution**: Google Isolated Sign Language Recognition Corpus (2023). Produced with Deaf community participants.
- **Usage in SIGNQUEST**: Landmark coordinate normalization benchmarks, signer generalization testing, and hand quality thresholds.

---

## 2. ChicagoFSWild / Kaggle ASL Fingerspelling Recognition
- **Source**: [Kaggle: Google — American Sign Language Fingerspelling Recognition](https://www.kaggle.com/competitions/asl-fingerspelling)
- **Publisher**: Google, Deaf Professional Arts Network (DPAN), Rochester Institute of Technology (RIT), and National Technical Institute for the Deaf (NTID).
- **License**: Open Data Commons Attribution License (ODC-By) v1.0 / CC BY 4.0.
- **Data Description**: High-speed, natural fingerspelling sequences from diverse signers across varied lighting, backgrounds, skin tones, and camera angles.
- **Attribution**: "American Sign Language Fingerspelling Recognition Dataset", Google / DPAN / NTID (2023).
- **Usage in SIGNQUEST**: 
  - Canonical 3D hand feature distributions for letters A–Z.
  - Inter-finger distance and joint angle tolerances for confusable pairs (A/S/E/T/M/N, B/4, C/O, D/L, K/V/P, U/R/V).
  - Trajectory dynamics for motion-dependent letters J and Z.

---

## 3. MediaPipe Hand Landmarker Model
- **Source**: Google MediaPipe Solutions ([MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker))
- **Architecture**: Two-stage pipeline (BlazePalm detector + 21 3D Landmark Regression model).
- **License**: Apache License 2.0.
- **Usage in SIGNQUEST**: Real-time on-device client-side hand tracking executed 100% in the browser via WebAssembly (WASM) and WebGL. No video frames are ever recorded, uploaded, or transmitted across the network.

---

## 4. Negative Sample & False-Positive Calibration Set
- **Synthetic & Augmented Dataset**: Generated specifically for SIGNQUEST to enforce the **"UNKNOWN is a first-class result"** principle.
- **Negative Classes Included**:
  1. Empty frame (no hand visible).
  2. Resting hand / relaxed posture.
  3. Transitional hand positions (e.g. moving between C and T).
  4. Random non-ASL gestures (waving, scratching, pointing).
  5. Partial/occluded hands (fingers out of frame).
  6. Ambiguous / borderline finger poses failing strict anatomical gating.
- **Usage**: Used to calibrate the confidence margin threshold ($Top_1 - Top_2 \ge 0.15$) and reject ambiguous gestures as `UNKNOWN`.

---

## 5. Compliance & Responsible Data Governance
- **No Raw Video Storage**: No webcam image or video stream is collected or stored on servers.
- **Attribution Compliance**: All derived geometric models, feature normalizers, and benchmarks comply with CC BY 4.0 and ODC-By attribution requirements.
- **Fair Representation**: Validated across left-handed and right-handed signers, varied hand sizes, and camera distances.
