"""
SIGNQUEST — Vectorized Fast Temporal Sequence Augmentation Pipeline
Applies realistic physical augmentations directly in NumPy at C-speed:
- 3D spatial rotations (consistent across sequence)
- Hand scale variance (+/- 15%)
- Landmark Gaussian jitter
- Random frame dropout (simulating webcam frame drops)
- Kinematic curl noise
"""

import math
import numpy as np

def augment_batch(batch):
    """
    Fast vectorized batch augmentation.
    Input batch: [B, T, D] where T = 24, D = 78.
    Returns: augmented batch of shape [B, T, D].
    """
    B, T, D = batch.shape
    aug = batch.copy()

    # 1. 3D Spatial Rotation per sample
    # Random Euler angles [B]
    rx = np.random.uniform(-0.20, 0.20, size=B).astype(np.float32)
    ry = np.random.uniform(-0.20, 0.20, size=B).astype(np.float32)
    rz = np.random.uniform(-0.25, 0.25, size=B).astype(np.float32)

    cx, sx = np.cos(rx), np.sin(rx)
    cy, sy = np.cos(ry), np.sin(ry)
    cz, sz = np.cos(rz), np.sin(rz)

    # Combined 3x3 rotation matrices for each sample: [B, 3, 3]
    # R = Rz * Ry * Rx
    R = np.zeros((B, 3, 3), dtype=np.float32)
    R[:, 0, 0] = cz * cy
    R[:, 0, 1] = cz * sy * sx - sz * cx
    R[:, 0, 2] = cz * sy * cx + sz * sx

    R[:, 1, 0] = sz * cy
    R[:, 1, 1] = sz * sy * sx + cz * cx
    R[:, 1, 2] = sz * sy * cx - cz * sx

    R[:, 2, 0] = -sy
    R[:, 2, 1] = cy * sx
    R[:, 2, 2] = cy * cx

    # Scale [B, 1, 1]
    scale = np.random.uniform(0.85, 1.15, size=(B, 1, 1)).astype(np.float32)

    # Reshape 63 coords to [B, T, 21, 3]
    coords = aug[:, :, :63].reshape(B, T, 21, 3) * scale[:, :, np.newaxis]

    # Rotate landmarks: (B, T, 21, 3) @ (B, 3, 3).T
    # Using einsum for speed: 'btji,bki->btjk'
    coords_rot = np.einsum('btji,bki->btjk', coords, R)

    # Add Gaussian jitter
    jitter = np.random.normal(0, 0.012, size=coords_rot.shape).astype(np.float32)
    coords_rot += jitter

    aug[:, :, :63] = coords_rot.reshape(B, T, 63)

    # 2. Kinematic curl jitter (curls are indices 63 to 68) if present
    if D > 63:
        curl_noise = np.random.normal(0, 0.03, size=(B, T, min(5, D - 63))).astype(np.float32)
        aug[:, :, 63:63 + curl_noise.shape[2]] = np.clip(aug[:, :, 63:63 + curl_noise.shape[2]] + curl_noise, 0.0, 1.0)

    # 3. Random frame dropout (linear interpolation for dropped frame)
    drop_mask = np.random.rand(B) < 0.25
    if np.any(drop_mask):
        drop_indices = np.random.randint(1, T - 1, size=B)
        for b in np.where(drop_mask)[0]:
            t = drop_indices[b]
            aug[b, t] = (aug[b, t - 1] + aug[b, t + 1]) * 0.5

    return aug

def augment_sequence(sequence):
    """Single sequence fallback adapter"""
    batch = sequence[np.newaxis, ...]
    return augment_batch(batch)[0]
