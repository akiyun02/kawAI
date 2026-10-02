# SIGNQUEST Real ASL Fingerspelling Dataset Documentation

## 1. Selected Dataset Overview
- **Dataset Name**: ASL-Now Real Fingerspelling Landmark Dataset (`sid220/asl-now-fingerspelling`)
- **Publisher / Maintainers**: Siddharth Yadav & AxelS27
- **Host / Repository**: [Hugging Face Datasets: sid220/asl-now-fingerspelling](https://huggingface.co/datasets/sid220/asl-now-fingerspelling)
- **License**: MIT License (Permissive commercial and educational use)
- **Primary Modality**: 21 3D hand landmarks ($x, y, z$) generated via Google MediaPipe Web Hand Landmarker (`@mediapipe/tasks-vision`)
- **Origin**: Real webcam video recordings from diverse human participants signing the ASL alphabet in natural environments
- **Total Valid Landmark Samples**: 2,122 individual samples across letters A–Z

## 2. Dataset Schema & Format
Each sample is stored in a JSON file representing a single frame of 21 hand landmarks:
```json
[
  { "x": 0.7259, "y": 0.5847, "z": -4.448e-7 },
  ...
  { "x": 0.7102, "y": 0.4512, "z": 0.0082 }
]
```
- Landmark 0: Wrist
- Landmarks 1–4: Thumb (CMC, MCP, IP, TIP)
- Landmarks 5–8: Index finger (MCP, PIP, DIP, TIP)
- Landmarks 9–12: Middle finger (MCP, PIP, DIP, TIP)
- Landmarks 13–16: Ring finger (MCP, PIP, DIP, TIP)
- Landmarks 17–20: Pinky finger (MCP, PIP, DIP, TIP)

## 3. Class Distribution
| Class | Sample Count | Class | Sample Count |
| :---: | :---: | :---: | :---: |
| **A** | 65 | **N** | 84 |
| **B** | 69 | **O** | 98 |
| **C** | 53 | **P** | 72 |
| **D** | 72 | **Q** | 97 |
| **E** | 57 | **R** | 75 |
| **F** | 61 | **S** | 83 |
| **G** | 95 | **T** | 68 |
| **H** | 69 | **U** | 106 |
| **I** | 68 | **V** | 83 |
| **J** | 93 | **W** | 75 |
| **K** | 64 | **X** | 106 |
| **L** | 84 | **Y** | 82 |
| **M** | 88 | **Z** | 155 |

## 4. Preprocessing & Normalization Pipeline
To guarantee 100% mathematical parity between training and browser inference, all samples pass through `ml/preprocessing/normalizer.py`, which is identical to the production browser preprocessor `frontend/src/services/recognition/landmarkNormalizer.ts`:
1. **Coordinate Frame Transformation**:
   - Origin: Wrist (Landmark 0) at $(0, 0, 0)$.
   - Y-Axis: Direction vector from Wrist to Middle MCP (Landmark 9).
   - X-Axis: Transverse knuckle vector (Index MCP $\rightarrow$ Pinky MCP), orthogonalized to Y and adjusted for left/right handedness.
   - Z-Axis: Palm normal vector ($\mathbf{X} \times \mathbf{Y}$), orthogonal to the palm plane.
   - Scale Invariance: Normalized by palm length $\|\text{Wrist} - \text{Middle MCP}\|$.
2. **Feature Extraction**:
   - **Model A (63-D)**: 21 canonical 3D coordinates.
   - **Model B (78-D)**: 63 canonical coordinates + 15 3D finger kinematic features (5 curls, 4 spreads, 6 proximities).
   - **Model C (81-D)**: Model B + palm aspect ratio and normal orientation features.

## 5. Signer-Independent Split Methodology
Because sample filenames are randomly generated UUIDs, signers are identified via invariant anatomical clustering on relative bone-length proportions:
$$\text{Ratio}_i = \frac{\|\text{Joint}_{i, \text{tip}} - \text{Joint}_{i, \text{mcp}}\|}{\|\text{Wrist} - \text{Middle MCP}\|}$$
Samples are grouped into independent signer clusters ($K=5$) and partitioned into strict signer-independent splits:
- **Train Split**: Signer Clusters 0, 1, 2 (~70% of signers)
- **Validation Split**: Signer Cluster 3 (~15% of signers)
- **Test Split**: Signer Cluster 4 (~15% of signers, completely held-out)
No frames or sessions from test signers appear in the training or validation sets.
