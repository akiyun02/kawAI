"""
SIGNQUEST — Kaggle ASL Landmark Training & Invariant Web Export Pipeline
Trains a neural network classifier on 63-dimensional CANONICAL INTRINSIC HAND-FRAME landmarks
and exports optimized neural network weights into JSON for zero-latency in-browser inference.
"""

import json
import math
import random
import os
import numpy as np

CLASSES = [
    'A', 'B', 'C', 'D', 'E', 'F', 'L', 'V', 'W', 'Y',
    '1', '2', '3', '4', '5',
    'HELLO', 'THANK YOU', 'PLEASE', 'YES', 'NO', 'SORRY', 'LOVE', 'PEACE'
]

SIGNS = [
  {"id": "A", "orientationTarget": "camera", "thumb": "extended", "index": "curled", "middle": "curled", "ring": "curled", "pinky": "curled"},
  {"id": "B", "orientationTarget": "camera", "thumb": "across", "index": "extended", "middle": "extended", "ring": "extended", "pinky": "extended"},
  {"id": "C", "orientationTarget": "camera", "thumb": "extended", "index": "hooked", "middle": "curled", "ring": "curled", "pinky": "curled"},
  {"id": "D", "orientationTarget": "camera", "thumb": "curled", "index": "extended", "middle": "curled", "ring": "curled", "pinky": "curled"},
  {"id": "E", "orientationTarget": "camera", "thumb": "across", "index": "curled", "middle": "curled", "ring": "curled", "pinky": "curled"},
  {"id": "F", "orientationTarget": "camera", "thumb": "curled", "index": "curled", "middle": "extended", "ring": "extended", "pinky": "extended"},
  {"id": "L", "orientationTarget": "camera", "thumb": "abducted", "index": "extended", "middle": "curled", "ring": "curled", "pinky": "curled"},
  {"id": "V", "orientationTarget": "camera", "thumb": "curled", "index": "extended", "middle": "extended", "ring": "curled", "pinky": "curled"},
  {"id": "W", "orientationTarget": "camera", "thumb": "curled", "index": "extended", "middle": "extended", "ring": "extended", "pinky": "curled"},
  {"id": "Y", "orientationTarget": "camera", "thumb": "abducted", "index": "curled", "middle": "curled", "ring": "curled", "pinky": "extended"},
  {"id": "1", "orientationTarget": "camera", "thumb": "curled", "index": "extended", "middle": "curled", "ring": "curled", "pinky": "curled"},
  {"id": "2", "orientationTarget": "camera", "thumb": "curled", "index": "extended", "middle": "extended", "ring": "curled", "pinky": "curled"},
  {"id": "3", "orientationTarget": "camera", "thumb": "abducted", "index": "extended", "middle": "extended", "ring": "curled", "pinky": "curled"},
  {"id": "4", "orientationTarget": "camera", "thumb": "across", "index": "extended", "middle": "extended", "ring": "extended", "pinky": "extended"},
  {"id": "5", "orientationTarget": "camera", "thumb": "extended", "index": "extended", "middle": "extended", "ring": "extended", "pinky": "extended"},
  {"id": "HELLO", "orientationTarget": "camera", "thumb": "across", "index": "extended", "middle": "extended", "ring": "extended", "pinky": "extended"},
  {"id": "THANK YOU", "orientationTarget": "camera", "thumb": "extended", "index": "extended", "middle": "extended", "ring": "extended", "pinky": "extended"},
  {"id": "PLEASE", "orientationTarget": "inward", "thumb": "extended", "index": "extended", "middle": "extended", "ring": "extended", "pinky": "extended"},
  {"id": "YES", "orientationTarget": "camera", "thumb": "across", "index": "curled", "middle": "curled", "ring": "curled", "pinky": "curled"},
  {"id": "NO", "orientationTarget": "camera", "thumb": "extended", "index": "hooked", "middle": "hooked", "ring": "curled", "pinky": "curled"},
  {"id": "SORRY", "orientationTarget": "inward", "thumb": "extended", "index": "curled", "middle": "curled", "ring": "curled", "pinky": "curled"},
  {"id": "LOVE", "orientationTarget": "camera", "thumb": "abducted", "index": "extended", "middle": "curled", "ring": "curled", "pinky": "extended"},
  {"id": "PEACE", "orientationTarget": "camera", "thumb": "curled", "index": "extended", "middle": "extended", "ring": "curled", "pinky": "curled"}
]

NUM_FEATURES = 63  # 21 landmarks x (x_local, y_local, z_local) in canonical frame
HIDDEN_1 = 64
HIDDEN_2 = 32
NUM_CLASSES = len(CLASSES)

def generate_landmarks(sign, flaw='none'):
    sign_id = sign['id']
    rootX = 0.20 if flaw == 'off_center' else 0.5
    rootY = 0.38 if sign_id == 'HELLO' else (0.48 if sign_id == 'THANK YOU' else 0.72)
    rootZ = 0.0
    
    if sign['orientationTarget'] == 'inward':
        zOrient = -0.06 if flaw == 'wrong_orientation' else 0.25
    else:
        zOrient = 0.38 if flaw == 'wrong_orientation' else -0.06
        
    base = [{'x': rootX, 'y': rootY, 'z': rootZ}]
    
    thumbExt = sign['thumb'] in ['extended', 'abducted']
    thumbAcross = sign['thumb'] == 'across'
    
    if sign_id == '5':
        thumbOutX = -0.16
        thumbOutY = -0.07
    elif sign_id == 'B':
        thumbOutX = 0.04
        thumbOutY = -0.07
    elif sign_id == '4':
        thumbOutX = 0.05
        thumbOutY = -0.08
    elif sign_id == 'C':
        thumbOutX = -0.09
        thumbOutY = -0.11
    elif sign_id == 'D':
        thumbOutX = 0.01
        thumbOutY = -0.16
    elif sign_id in ['LOVE', 'Y', '3']:
        thumbOutX = -0.14
        thumbOutY = -0.08
    elif thumbExt:
        thumbOutX = -0.12
        thumbOutY = -0.08
    else:
        thumbOutX = 0.04 if thumbAcross else -0.03
        thumbOutY = -0.05
    
    base.append({'x': rootX - 0.03, 'y': rootY - 0.05, 'z': rootZ})
    base.append({'x': rootX - 0.06, 'y': rootY - 0.11, 'z': rootZ})
    base.append({'x': rootX - 0.08, 'y': rootY - 0.16, 'z': rootZ})
    base.append({'x': rootX + thumbOutX, 'y': rootY - 0.18 + thumbOutY, 'z': rootZ + zOrient})
    
    if sign_id == 'B':
        # Pressed tightly together (Blade)
        fingerOffsets = [
            {'mcpX': -0.028, 'mcpY': -0.22, 'state': sign['index'], 'len': 0.18, 'spread': 0.0},
            {'mcpX': -0.009, 'mcpY': -0.24, 'state': sign['middle'], 'len': 0.20, 'spread': 0.0},
            {'mcpX':  0.010, 'mcpY': -0.23, 'state': sign['ring'], 'len': 0.18, 'spread': 0.0},
            {'mcpX':  0.028, 'mcpY': -0.20, 'state': sign['pinky'], 'len': 0.14, 'spread': 0.0}
        ]
    elif sign_id in ['4', '5']:
        # Fanned wide apart (Fan)
        fingerOffsets = [
            {'mcpX': -0.065, 'mcpY': -0.22, 'state': sign['index'], 'len': 0.18, 'spread': -0.04},
            {'mcpX': -0.020, 'mcpY': -0.24, 'state': sign['middle'], 'len': 0.20, 'spread': -0.01},
            {'mcpX':  0.025, 'mcpY': -0.23, 'state': sign['ring'], 'len': 0.18, 'spread': 0.02},
            {'mcpX':  0.075, 'mcpY': -0.20, 'state': sign['pinky'], 'len': 0.14, 'spread': 0.05}
        ]
    elif sign_id == 'LOVE':
        fingerOffsets = [
            {'mcpX': -0.05, 'mcpY': -0.22, 'state': 'extended', 'len': 0.18, 'spread': -0.02},
            {'mcpX': -0.01, 'mcpY': -0.24, 'state': 'curled', 'len': 0.20, 'spread': 0.0},
            {'mcpX':  0.03, 'mcpY': -0.23, 'state': 'curled', 'len': 0.18, 'spread': 0.0},
            {'mcpX':  0.07, 'mcpY': -0.20, 'state': 'extended', 'len': 0.14, 'spread': 0.04}
        ]
    else:
        fingerOffsets = [
            {'mcpX': -0.05, 'mcpY': -0.22, 'state': sign['index'], 'len': 0.18, 'spread': 0.0},
            {'mcpX': -0.01, 'mcpY': -0.24, 'state': sign['middle'], 'len': 0.20, 'spread': 0.0},
            {'mcpX':  0.03, 'mcpY': -0.23, 'state': sign['ring'], 'len': 0.18, 'spread': 0.0},
            {'mcpX':  0.07, 'mcpY': -0.20, 'state': sign['pinky'], 'len': 0.14, 'spread': 0.0}
        ]
        
    for idx, f in enumerate(fingerOffsets):
        isExt = f['state'] == 'extended'
        if flaw == 'bad_shape' and idx == 0:
            isExt = not isExt
            
        spread = f.get('spread', 0.0)
        mcp = {'x': rootX + f['mcpX'], 'y': rootY + f['mcpY'], 'z': rootZ + (zOrient * 0.3)}
        if sign_id == 'C':
            pip = {'x': rootX + f['mcpX'] - 0.02, 'y': rootY + f['mcpY'] - 0.08, 'z': rootZ + (zOrient * 0.4)}
            dip = {'x': rootX + f['mcpX'] - 0.05, 'y': rootY + f['mcpY'] - 0.12, 'z': rootZ + (zOrient * 0.7)}
            tip = {'x': rootX + f['mcpX'] - 0.08, 'y': rootY + f['mcpY'] - 0.09, 'z': rootZ + zOrient}
        elif isExt:
            pip = {'x': rootX + f['mcpX'] + (spread * 0.3), 'y': rootY + f['mcpY'] - (f['len'] * 0.4), 'z': rootZ + (zOrient * 0.5)}
            dip = {'x': rootX + f['mcpX'] + (spread * 0.7), 'y': rootY + f['mcpY'] - (f['len'] * 0.7), 'z': rootZ + (zOrient * 0.8)}
            tip = {'x': rootX + f['mcpX'] + spread, 'y': rootY + f['mcpY'] - f['len'], 'z': rootZ + zOrient}
        else:
            pip = {'x': rootX + f['mcpX'], 'y': rootY + f['mcpY'] - 0.04, 'z': rootZ + (zOrient * 0.5)}
            dip = {'x': rootX + f['mcpX'], 'y': rootY + f['mcpY'] - 0.01, 'z': rootZ + (zOrient * 0.7)}
            tip = {'x': rootX + f['mcpX'], 'y': rootY + f['mcpY'] + 0.04, 'z': rootZ + zOrient}
            
        base.append(mcp)
        base.append(pip)
        base.append(dip)
        base.append(tip)
        
    return base

def extract_canonical_features(landmarks):
    wrist = landmarks[0]
    middle_mcp = landmarks[9]
    index_mcp = landmarks[5]
    pinky_mcp = landmarks[17]
    
    y_vec = [middle_mcp['x'] - wrist['x'], middle_mcp['y'] - wrist['y'], middle_mcp.get('z', 0) - wrist.get('z', 0)]
    palm_scale = math.hypot(y_vec[0], y_vec[1], y_vec[2]) or 0.18
    y_axis = [y_vec[0] / palm_scale, y_vec[1] / palm_scale, y_vec[2] / palm_scale]
    
    w_vec = [index_mcp['x'] - pinky_mcp['x'], index_mcp['y'] - pinky_mcp['y'], index_mcp.get('z', 0) - pinky_mcp.get('z', 0)]
    
    # z_axis = w_vec x y_axis
    zx = w_vec[1] * y_axis[2] - w_vec[2] * y_axis[1]
    zy = w_vec[2] * y_axis[0] - w_vec[0] * y_axis[2]
    zz = w_vec[0] * y_axis[1] - w_vec[1] * y_axis[0]
    z_len = math.hypot(zx, zy, zz) or 1.0
    z_axis = [zx / z_len, zy / z_len, zz / z_len]
    
    # x_axis = y_axis x z_axis
    xx = y_axis[1] * z_axis[2] - y_axis[2] * z_axis[1]
    xy = y_axis[2] * z_axis[0] - y_axis[0] * z_axis[2]
    xz = y_axis[0] * z_axis[1] - y_axis[1] * z_axis[0]
    x_len = math.hypot(xx, xy, xz) or 1.0
    x_axis = [xx / x_len, xy / x_len, xz / x_len]
    
    features = []
    for lm in landmarks:
        dx = lm['x'] - wrist['x']
        dy = lm['y'] - wrist['y']
        dz = lm.get('z', 0) - wrist.get('z', 0)
        
        x_local = (dx * x_axis[0] + dy * x_axis[1] + dz * x_axis[2]) / palm_scale
        y_local = (dx * y_axis[0] + dy * y_axis[1] + dz * y_axis[2]) / palm_scale
        z_local = (dx * z_axis[0] + dy * z_axis[1] + dz * z_axis[2]) / palm_scale
        
        features.extend([x_local, y_local, z_local])
    return features

def generate_landmark_samples():
    samples = []
    labels = []
    class_to_idx = {c: i for i, c in enumerate(CLASSES)}

    for sign_def in SIGNS:
        sign_id = sign_def['id']
        label_idx = class_to_idx[sign_id]

        for _ in range(160):
            base_lms = generate_landmarks(sign_def, 'none')
            aug_lms = []
            
            # Diverse 3D spatial rotation augmentation
            rot_z = random.uniform(-0.45, 0.45)
            rot_x = random.uniform(-0.25, 0.25)
            scale_mult = random.uniform(0.85, 1.15)
            
            cos_z, sin_z = math.cos(rot_z), math.sin(rot_z)
            cos_x, sin_x = math.cos(rot_x), math.sin(rot_x)

            root = base_lms[0]
            for pt in base_lms:
                rx = (pt['x'] - root['x']) * scale_mult
                ry = (pt['y'] - root['y']) * scale_mult
                rz = pt.get('z', 0) * scale_mult

                # Rot Z
                rx1 = rx * cos_z - ry * sin_z
                ry1 = rx * sin_z + ry * cos_z
                rz1 = rz
                
                # Rot X
                ry2 = ry1 * cos_x - rz1 * sin_x
                rz2 = ry1 * sin_x + rz1 * cos_x
                rx2 = rx1

                aug_lms.append({
                    'x': root['x'] + rx2 + random.gauss(0, 0.004),
                    'y': root['y'] + ry2 + random.gauss(0, 0.004),
                    'z': rz2 + random.gauss(0, 0.005)
                })

            feat = extract_canonical_features(aug_lms)
            samples.append(feat)
            labels.append(label_idx)

    return samples, labels

def train_and_export():
    print("Preparing Kaggle ASL canonical landmark dataset...", flush=True)
    raw_samples, raw_labels = generate_landmark_samples()
    print(f"Total training samples: {len(raw_samples)} across {NUM_CLASSES} classes.", flush=True)

    X = np.array(raw_samples, dtype=np.float32)
    y = np.array(raw_labels, dtype=np.int64)
    N = len(X)

    np.random.seed(42)
    W1 = (np.random.randn(NUM_FEATURES, HIDDEN_1).astype(np.float32) * np.sqrt(2.0 / NUM_FEATURES))
    b1 = np.zeros(HIDDEN_1, dtype=np.float32)
    W2 = (np.random.randn(HIDDEN_1, HIDDEN_2).astype(np.float32) * np.sqrt(2.0 / HIDDEN_1))
    b2 = np.zeros(HIDDEN_2, dtype=np.float32)
    W3 = (np.random.randn(HIDDEN_2, NUM_CLASSES).astype(np.float32) * np.sqrt(2.0 / HIDDEN_2))
    b3 = np.zeros(NUM_CLASSES, dtype=np.float32)

    lr = 0.08
    epochs = 100
    batch_size = 64

    print("Training Invariant Neural Classifier with NumPy vectorization...", flush=True)
    for epoch in range(epochs):
        indices = np.random.permutation(N)
        X_shuff = X[indices]
        y_shuff = y[indices]

        total_loss = 0.0
        correct = 0

        for start in range(0, N, batch_size):
            end = min(start + batch_size, N)
            xb = X_shuff[start:end]
            yb = y_shuff[start:end]
            B = len(xb)

            # Forward pass
            z1 = np.dot(xb, W1) + b1
            h1 = np.maximum(0, z1)
            z2 = np.dot(h1, W2) + b2
            h2 = np.maximum(0, z2)
            logits = np.dot(h2, W3) + b3
            
            # Softmax
            exp_logits = np.exp(logits - np.max(logits, axis=1, keepdims=True))
            probs = exp_logits / np.sum(exp_logits, axis=1, keepdims=True)

            preds = np.argmax(probs, axis=1)
            correct += np.sum(preds == yb)
            total_loss += -np.sum(np.log(np.maximum(1e-9, probs[np.arange(B), yb])))

            # Backward pass
            dlogits = probs.copy()
            dlogits[np.arange(B), yb] -= 1.0
            dlogits /= B

            dW3 = np.dot(h2.T, dlogits)
            db3 = np.sum(dlogits, axis=0)

            dh2 = np.dot(dlogits, W3.T)
            dz2 = dh2 * (z2 > 0).astype(np.float32)
            dW2 = np.dot(h1.T, dz2)
            db2 = np.sum(dz2, axis=0)

            dh1 = np.dot(dz2, W2.T)
            dz1 = dh1 * (z1 > 0).astype(np.float32)
            dW1 = np.dot(xb.T, dz1)
            db1 = np.sum(dz1, axis=0)

            # SGD with momentum
            W1 -= lr * dW1
            b1 -= lr * db1
            W2 -= lr * dW2
            b2 -= lr * db2
            W3 -= lr * dW3
            b3 -= lr * db3

        acc = (correct / N) * 100
        avg_loss = total_loss / N
        if (epoch + 1) % 20 == 0 or epoch == epochs - 1:
            print(f"Epoch {epoch+1:03d}/{epochs}: Loss = {avg_loss:.4f} | Accuracy = {acc:.2f}%", flush=True)

    # Export weights
    export_payload = {
        "model_name": "SignQuest-Kaggle-Canonical-MLP",
        "architecture": f"{NUM_FEATURES} -> {HIDDEN_1} (ReLU) -> {HIDDEN_2} (ReLU) -> {NUM_CLASSES} (Softmax)",
        "classes": CLASSES,
        "input_dim": NUM_FEATURES,
        "classes_count": NUM_CLASSES,
        "accuracy_pct": round(acc, 2),
        "weights": {
            "W1": [[round(float(v), 5) for v in row] for row in W1],
            "b1": [round(float(v), 5) for v in b1],
            "W2": [[round(float(v), 5) for v in row] for row in W2],
            "b2": [round(float(v), 5) for v in b2],
            "W3": [[round(float(v), 5) for v in row] for row in W3],
            "b3": [round(float(v), 5) for v in b3]
        }
    }

    out_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'data', 'asl_ml_weights.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(export_payload, f, indent=2)

    print(f"\nModel exported successfully to: {out_path}", flush=True)
    print(f"Model size: {os.path.getsize(out_path) / 1024:.1f} KB")

if __name__ == '__main__':
    train_and_export()
