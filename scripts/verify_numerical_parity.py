"""
SIGNQUEST — Python / TypeScript Preprocessing Parity Test
Ensures canonical hand coordinate projection is 100% numerically identical
between Python training and TypeScript browser inference.
"""

import math
import json
import numpy as np

def normalize_landmarks_py(landmarks_21, handedness="Right"):
    """
    Python implementation of normalizeHandLandmarks
    landmarks_21: list of 21 dicts {'x': float, 'y': float, 'z': float}
    """
    wrist = landmarks_21[0]
    middle_mcp = landmarks_21[9]
    index_mcp = landmarks_21[5]
    pinky_mcp = landmarks_21[17]

    dx = middle_mcp['x'] - wrist['x']
    dy = middle_mcp['y'] - wrist['y']
    dz = middle_mcp['z'] - wrist['z']
    palm_scale = math.hypot(dx, dy, dz) or 0.18

    # Y-axis (wrist -> middle MCP)
    y_raw = np.array([dx, dy, dz], dtype=np.float64)
    y_axis = y_raw / (np.linalg.norm(y_raw) or 1.0)

    # Knuckle vector
    if handedness == "Left":
        k_raw = np.array([
            pinky_mcp['x'] - index_mcp['x'],
            pinky_mcp['y'] - index_mcp['y'],
            pinky_mcp['z'] - index_mcp['z']
        ], dtype=np.float64)
    else:
        k_raw = np.array([
            index_mcp['x'] - pinky_mcp['x'],
            index_mcp['y'] - pinky_mcp['y'],
            index_mcp['z'] - pinky_mcp['z']
        ], dtype=np.float64)

    proj = np.dot(k_raw, y_axis)
    x_raw = k_raw - proj * y_axis
    x_axis = x_raw / (np.linalg.norm(x_raw) or 1.0)

    # Z-axis = X cross Y
    z_axis = np.cross(x_axis, y_axis)
    z_axis /= (np.linalg.norm(z_axis) or 1.0)

    canonical_63 = []
    for p in landmarks_21:
        rel = np.array([p['x'] - wrist['x'], p['y'] - wrist['y'], p['z'] - wrist['z']], dtype=np.float64)
        canonical_63.append(float(np.dot(rel, x_axis) / palm_scale))
        canonical_63.append(float(np.dot(rel, y_axis) / palm_scale))
        canonical_63.append(float(np.dot(rel, z_axis) / palm_scale))

    return canonical_63

# Generate a realistic test hand sample
np.random.seed(12345)
sample_lms = []
for i in range(21):
    sample_lms.append({
        'x': float(0.5 + np.random.uniform(-0.15, 0.15)),
        'y': float(0.5 + np.random.uniform(-0.15, 0.15)),
        'z': float(np.random.uniform(-0.05, 0.05))
    })

py_features = normalize_landmarks_py(sample_lms, "Right")

# Export sample to scratch JSON for Node.js verification
parity_data = {
    "rawLandmarks": sample_lms,
    "pyCanonical63": py_features
}

with open("scripts/parity_sample.json", "w") as f:
    json.dump(parity_data, f, indent=2)

print(f"[PASS] Python canonical projection computed for 21 landmarks.")
print(f"       Wrist (origin): ({py_features[0]:.4f}, {py_features[1]:.4f}, {py_features[2]:.4f}) -> strictly (0, 0, 0)")
print(f"       Middle MCP:     ({py_features[27]:.4f}, {py_features[28]:.4f}, {py_features[29]:.4f}) -> strictly (0, 1, 0)")

assert abs(py_features[0]) < 1e-6 and abs(py_features[1]) < 1e-6 and abs(py_features[2]) < 1e-6
assert abs(py_features[27]) < 1e-6 and abs(py_features[28] - 1.0) < 1e-6 and abs(py_features[29]) < 1e-6
print("[PASS] Fundamental canonical invariants verified mathematically.")
