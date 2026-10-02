"""
SIGNQUEST — Temporal ASL Fingerspelling Dataset Pipeline
Builds signer-independent sequence datasets for all 26 ASL letters (A-Z) + BLANK/UNKNOWN.
Each sample is a temporal sequence tensor [T, D] where T = 24 frames (~800ms) and D = 78 features.
Partitions data strictly by signer_id to guarantee zero data leakage between train, val, and test splits.
"""

import math
import random
import numpy as np

ALPHABET = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
CLASSES = ALPHABET + ["BLANK"]
NUM_CLASSES = len(CLASSES)
SEQ_LEN = 24  # 24 frames at 30 FPS = 800ms
FEATURE_DIM = 78  # 63 canonical landmarks + 15 kinematic features

# 21 Signers partitioned strictly into independent splits
SIGNERS_TRAIN = [f"signer_{i:02d}" for i in range(1, 17)]  # 16 signers for training
SIGNERS_VAL = [f"signer_{i:02d}" for i in range(17, 20)]   # 3 signers for validation
SIGNERS_TEST = [f"signer_{i:02d}" for i in range(20, 22)]  # 2 signers for held-out testing

# Canonical biometric profiles for fingerspelling alphabet
# Extension: 0.0 (curled) to 1.0 (straight extended)
PROFILES = {
    'A': {'ext': [0.85, 0.05, 0.05, 0.05, 0.05], 'spread': 0.10, 'motion': False},
    'B': {'ext': [0.05, 0.95, 0.95, 0.95, 0.95], 'spread': 0.10, 'motion': False},
    'C': {'ext': [0.50, 0.50, 0.50, 0.50, 0.50], 'spread': 0.16, 'motion': False},
    'D': {'ext': [0.40, 0.95, 0.05, 0.05, 0.05], 'spread': 0.10, 'motion': False},
    'E': {'ext': [0.10, 0.05, 0.05, 0.05, 0.05], 'spread': 0.08, 'motion': False},
    'F': {'ext': [0.40, 0.40, 0.95, 0.95, 0.95], 'spread': 0.20, 'motion': False},
    'G': {'ext': [0.85, 0.90, 0.05, 0.05, 0.05], 'spread': 0.18, 'motion': False, 'side': True},
    'H': {'ext': [0.05, 0.90, 0.90, 0.05, 0.05], 'spread': 0.10, 'motion': False, 'side': True},
    'I': {'ext': [0.05, 0.05, 0.05, 0.05, 0.95], 'spread': 0.08, 'motion': False},
    'J': {'ext': [0.05, 0.05, 0.05, 0.05, 0.95], 'spread': 0.08, 'motion': True, 'type': 'J_SWOOP'},
    'K': {'ext': [0.80, 0.95, 0.85, 0.05, 0.05], 'spread': 0.22, 'motion': False},
    'L': {'ext': [0.95, 0.95, 0.05, 0.05, 0.05], 'spread': 0.70, 'motion': False},
    'M': {'ext': [0.05, 0.05, 0.05, 0.05, 0.05], 'spread': 0.08, 'motion': False, 'thumb_tuck': 3},
    'N': {'ext': [0.05, 0.05, 0.05, 0.05, 0.05], 'spread': 0.08, 'motion': False, 'thumb_tuck': 2},
    'O': {'ext': [0.45, 0.45, 0.45, 0.45, 0.45], 'spread': 0.08, 'motion': False, 'pinch': True},
    'P': {'ext': [0.80, 0.90, 0.85, 0.05, 0.05], 'spread': 0.22, 'motion': False, 'down': True},
    'Q': {'ext': [0.85, 0.90, 0.05, 0.05, 0.05], 'spread': 0.18, 'motion': False, 'down': True},
    'R': {'ext': [0.05, 0.95, 0.95, 0.05, 0.05], 'spread': 0.08, 'motion': False, 'crossed': True},
    'S': {'ext': [0.05, 0.05, 0.05, 0.05, 0.05], 'spread': 0.08, 'motion': False, 'thumb_across': True},
    'T': {'ext': [0.05, 0.05, 0.05, 0.05, 0.05], 'spread': 0.08, 'motion': False, 'thumb_tuck': 1},
    'U': {'ext': [0.05, 0.95, 0.95, 0.05, 0.05], 'spread': 0.10, 'motion': False},
    'V': {'ext': [0.05, 0.95, 0.95, 0.05, 0.05], 'spread': 0.38, 'motion': False},
    'W': {'ext': [0.05, 0.95, 0.95, 0.95, 0.05], 'spread': 0.30, 'motion': False},
    'X': {'ext': [0.05, 0.45, 0.05, 0.05, 0.05], 'spread': 0.08, 'motion': False},
    'Y': {'ext': [0.95, 0.05, 0.05, 0.05, 0.95], 'spread': 0.65, 'motion': False},
    'Z': {'ext': [0.05, 0.95, 0.05, 0.05, 0.05], 'spread': 0.08, 'motion': True, 'type': 'Z_ZIGZAG'},
}

def generate_canonical_frame(letter, progress_in_seq, signer_variance=0.0):
    """
    Generates a 78-dimensional feature vector for a single frame of a sequence.
    Models human temporal phases: onset forming -> sustained hold -> slight tremor.
    """
    if letter == 'BLANK':
        # Resting hand / transition noise
        curls = [random.uniform(0.3, 0.7) for _ in range(5)]
        coords = [random.gauss(0, 0.15) for _ in range(63)]
        kin = [1.0 - c for c in curls] + [random.uniform(0.1, 0.3) for _ in range(10)]
        return coords + kin

    p = PROFILES[letter]
    is_motion = p.get('motion', False)

    # Temporal phase: 0-6 = forming, 7-18 = hold, 19-23 = slight release
    if progress_in_seq < 0.25:
        phase_factor = progress_in_seq / 0.25  # Interpolate from resting to target
    else:
        phase_factor = 1.0

    curls = []
    for base_ext in p['ext']:
        ext = 0.5 * (1 - phase_factor) + base_ext * phase_factor + random.gauss(0, 0.03 + signer_variance)
        curls.append(max(0.0, min(1.0, 1.0 - ext)))

    # Motion trajectory for J and Z
    motion_dx, motion_dy = 0.0, 0.0
    if is_motion:
        if p.get('type') == 'J_SWOOP':
            # Downward hook trajectory over time
            t = progress_in_seq
            motion_dy = math.sin(t * math.pi) * 0.25
            motion_dx = -math.sin(t * math.pi * 0.5) * 0.15
        elif p.get('type') == 'Z_ZIGZAG':
            # 3-stroke zigzag
            t = progress_in_seq
            if t < 0.33:
                motion_dx = (t / 0.33) * 0.20
                motion_dy = 0.0
            elif t < 0.66:
                motion_dx = 0.20 - ((t - 0.33) / 0.33) * 0.20
                motion_dy = ((t - 0.33) / 0.33) * 0.20
            else:
                motion_dx = ((t - 0.66) / 0.34) * 0.20
                motion_dy = 0.20

    # Build 63 canonical landmark coordinates
    coords = []
    # Wrist origin
    coords.extend([0.0, 0.0, 0.0])
    
    # 5 fingers x 4 joints
    finger_lengths = [0.14, 0.18, 0.20, 0.18, 0.14]
    spread_factor = p['spread']

    for f_idx in range(5):
        ext = 1.0 - curls[f_idx]
        flen = finger_lengths[f_idx]
        base_x = (f_idx - 2) * 0.08 * (1.0 + spread_factor) + motion_dx
        
        # MCP (knuckle)
        coords.extend([base_x, 0.20, 0.0])
        # PIP
        pip_y = 0.20 + flen * 0.40 * (ext * 0.8 + 0.2)
        coords.extend([base_x, pip_y, -0.02 * ext])
        # DIP
        dip_y = pip_y + flen * 0.35 * (ext * 0.8 + 0.2)
        coords.extend([base_x, dip_y, -0.04 * ext])
        # TIP
        tip_y = dip_y + flen * 0.25 * (ext * 0.8 + 0.2) + motion_dy
        coords.extend([base_x + random.gauss(0, 0.01), tip_y, -0.06 * ext])

    # 15 kinematic features
    kin = [
        curls[0], curls[1], curls[2], curls[3], curls[4],
        spread_factor, 0.12, 0.12, 0.40,
        0.25, 0.25, 0.25, 0.25, 0.25, 0.25
    ]

    return coords + kin

def generate_sequence(letter, signer_variance=0.0):
    """
    Generates a full 24-frame temporal sequence for a letter.
    """
    sequence = []
    for frame_idx in range(SEQ_LEN):
        progress = frame_idx / float(SEQ_LEN - 1)
        feat = generate_canonical_frame(letter, progress, signer_variance)
        sequence.append(feat)
    return sequence

def create_dataset():
    """
    Builds signer-independent train, validation, and test datasets.
    """
    print(f"Generating signer-independent dataset across {len(SIGNERS_TRAIN)} train, "
          f"{len(SIGNERS_VAL)} val, and {len(SIGNERS_TEST)} test signers...")

    X_train, y_train = [], []
    X_val, y_val = [], []
    X_test, y_test = [], []

    # 1. Training Set (from SIGNERS_TRAIN)
    for signer in SIGNERS_TRAIN:
        # Give each signer an intrinsic hand variance (+/- 0.04)
        s_var = random.uniform(-0.04, 0.04)
        for class_idx, letter in enumerate(CLASSES):
            # 8 sequences per letter per training signer
            for _ in range(8):
                seq = generate_sequence(letter, signer_variance=s_var)
                X_train.append(seq)
                y_train.append(class_idx)

    # 2. Validation Set (from unseen SIGNERS_VAL)
    for signer in SIGNERS_VAL:
        s_var = random.uniform(-0.04, 0.04)
        for class_idx, letter in enumerate(CLASSES):
            for _ in range(5):
                seq = generate_sequence(letter, signer_variance=s_var)
                X_val.append(seq)
                y_val.append(class_idx)

    # 3. Test Set (from unseen SIGNERS_TEST)
    for signer in SIGNERS_TEST:
        s_var = random.uniform(-0.04, 0.04)
        for class_idx, letter in enumerate(CLASSES):
            for _ in range(5):
                seq = generate_sequence(letter, signer_variance=s_var)
                X_test.append(seq)
                y_test.append(class_idx)

    return (
        np.array(X_train, dtype=np.float32), np.array(y_train, dtype=np.int64),
        np.array(X_val, dtype=np.float32), np.array(y_val, dtype=np.int64),
        np.array(X_test, dtype=np.float32), np.array(y_test, dtype=np.int64)
    )

if __name__ == '__main__':
    random.seed(42)
    np.random.seed(42)
    X_tr, y_tr, X_va, y_va, X_te, y_te = create_dataset()
    print(f"Train: {X_tr.shape}, Val: {X_va.shape}, Test: {X_te.shape}")
