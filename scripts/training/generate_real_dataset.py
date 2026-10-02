"""
SIGNQUEST — Anatomically Grounded MediaPipe Landmark Dataset Generator
Models real human skeletal hand anatomy according to the MediaPipe 21-joint standard:
- Landmark 0: Wrist
- Landmarks 1-4: Thumb (CMC, MCP, IP, TIP)
- Landmarks 5-8: Index (MCP, PIP, DIP, TIP)
- Landmarks 9-12: Middle (MCP, PIP, DIP, TIP)
- Landmarks 13-16: Ring (MCP, PIP, DIP, TIP)
- Landmarks 17-20: Pinky (MCP, PIP, DIP, TIP)

All coordinates are generated in the canonical coordinate frame:
- Wrist at origin (0, 0, 0)
- Middle MCP at (0, 1, 0)
- Knuckle plane aligned with X-axis, palm normal aligned with Z-axis
- Division by palmScale produces 63 pure scale- and rotation-invariant features.
"""

import math
import random
import numpy as np

ALPHABET = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
CLASSES = ALPHABET + ["BLANK"]
NUM_CLASSES = len(CLASSES)
SEQ_LEN = 24
FEATURE_DIM = 63  # Pure canonical 3D coordinates (21 x 3)

# 21 Signers partitioned strictly into independent splits
SIGNERS_TRAIN = [f"signer_{i:02d}" for i in range(1, 17)]  # 16 signers for training
SIGNERS_VAL = [f"signer_{i:02d}" for i in range(17, 20)]   # 3 signers for validation
SIGNERS_TEST = [f"signer_{i:02d}" for i in range(20, 22)]  # 2 signers for held-out testing

# Real human hand proportions relative to palm length (Wrist -> Middle MCP = 1.0)
ANATOMY = {
    'palm_scale': 1.0,
    # Knuckle positions in canonical frame (Wrist = [0,0,0], Middle MCP = [0,1,0])
    'mcps': {
        'thumb_cmc': np.array([-0.28, 0.22, 0.05]),
        'index_mcp':  np.array([-0.36, 0.90, 0.00]),
        'middle_mcp': np.array([ 0.00, 1.00, 0.00]),
        'ring_mcp':   np.array([ 0.32, 0.92, -0.01]),
        'pinky_mcp':  np.array([ 0.60, 0.80, -0.03]),
    },
    # Bone segment lengths relative to palm scale
    'bone_lengths': {
        'thumb':  [0.26, 0.24, 0.20], # CMC->MCP, MCP->IP, IP->TIP
        'index':  [0.34, 0.22, 0.18], # MCP->PIP, PIP->DIP, DIP->TIP
        'middle': [0.38, 0.25, 0.20],
        'ring':   [0.34, 0.22, 0.18],
        'pinky':  [0.26, 0.18, 0.15],
    }
}

# Anatomical posture profiles for all 26 letters
# curls: [thumb_curl, index_curl, mid_curl, ring_curl, pinky_curl] where 0.05 = extended straight, 0.95 = curled tight
POSTURES = {
    'A': {'thumb': 'upright_along_index', 'curls': [0.10, 0.95, 0.95, 0.95, 0.95], 'spread': 0.05},
    'B': {'thumb': 'across_palm',         'curls': [0.85, 0.05, 0.05, 0.05, 0.05], 'spread': 0.02}, # Blade tight together
    'C': {'thumb': 'curved_c',            'curls': [0.45, 0.50, 0.50, 0.50, 0.50], 'spread': 0.16}, # Arc
    'D': {'thumb': 'touch_middle',        'curls': [0.60, 0.05, 0.90, 0.90, 0.90], 'spread': 0.08}, # Index up
    'E': {'thumb': 'tight_across',        'curls': [0.95, 0.95, 0.95, 0.95, 0.95], 'spread': 0.02}, # Clapped fist
    'F': {'thumb': 'touch_index',         'curls': [0.60, 0.70, 0.05, 0.05, 0.05], 'spread': 0.25}, # OK sign
    'G': {'thumb': 'index_parallel',      'curls': [0.15, 0.05, 0.95, 0.95, 0.95], 'spread': 0.08}, # Index forward, thumb parallel
    'H': {'thumb': 'tucked_under_middle', 'curls': [0.85, 0.05, 0.05, 0.95, 0.95], 'spread': 0.01}, # Index+Middle forward together, thumb tucked under
    'I': {'thumb': 'across_palm',         'curls': [0.80, 0.95, 0.95, 0.95, 0.05], 'spread': 0.05}, # Pinky up
    'J': {'thumb': 'across_palm',         'curls': [0.80, 0.95, 0.95, 0.95, 0.05], 'spread': 0.05, 'motion': 'J_SWOOP'},
    'K': {'thumb': 'between_index_mid',   'curls': [0.15, 0.05, 0.20, 0.95, 0.95], 'spread': 0.25}, # V with thumb up
    'L': {'thumb': 'wide_extended',       'curls': [0.05, 0.05, 0.95, 0.95, 0.95], 'spread': 0.60}, # L shape
    'M': {'thumb': 'tuck_3',              'curls': [0.90, 0.85, 0.85, 0.85, 0.95], 'spread': 0.02}, # Fist thumb under 3
    'N': {'thumb': 'tuck_2',              'curls': [0.90, 0.85, 0.85, 0.95, 0.95], 'spread': 0.02}, # Fist thumb under 2
    'O': {'thumb': 'touch_all',           'curls': [0.55, 0.55, 0.55, 0.55, 0.55], 'spread': 0.05}, # O circle
    'P': {'thumb': 'between_index_mid',   'curls': [0.20, 0.05, 0.35, 0.95, 0.95], 'spread': 0.25, 'down': True}, # K pointed down
    'Q': {'thumb': 'index_parallel',      'curls': [0.20, 0.10, 0.95, 0.95, 0.95], 'spread': 0.08, 'down': True}, # G pointed down
    'R': {'thumb': 'tucked',              'curls': [0.80, 0.05, 0.05, 0.95, 0.95], 'spread': 0.01, 'crossed': True}, # Crossed fingers
    'S': {'thumb': 'front_across',        'curls': [0.70, 0.95, 0.95, 0.95, 0.95], 'spread': 0.02}, # Fist thumb over fingers
    'T': {'thumb': 'tuck_1',              'curls': [0.85, 0.85, 0.95, 0.95, 0.95], 'spread': 0.02}, # Thumb between index & mid
    'U': {'thumb': 'across_ring_pinky',   'curls': [0.80, 0.05, 0.05, 0.95, 0.95], 'spread': 0.01}, # Index & mid together up, thumb over ring
    'V': {'thumb': 'across_palm',         'curls': [0.80, 0.05, 0.05, 0.95, 0.95], 'spread': 0.40}, # Peace sign V
    'W': {'thumb': 'tucked_pinky',        'curls': [0.80, 0.05, 0.05, 0.05, 0.95], 'spread': 0.30}, # 3 fingers up
    'X': {'thumb': 'tucked',              'curls': [0.80, 0.55, 0.95, 0.95, 0.95], 'spread': 0.05, 'hooked': True}, # Hooked index
    'Y': {'thumb': 'wide_extended',       'curls': [0.05, 0.95, 0.95, 0.95, 0.05], 'spread': 0.65}, # Hang loose
    'Z': {'thumb': 'tucked',              'curls': [0.80, 0.05, 0.95, 0.95, 0.95], 'spread': 0.05, 'motion': 'Z_ZIGZAG'},
}

def generate_anatomical_landmarks(letter, t_progress=1.0, signer_params=None):
    """
    Generates 21 3D canonical landmarks for a human hand performing the target letter.
    t_progress: 0.0 (onset/forming) to 1.0 (fully sustained)
    signer_params: dict containing signer-specific anatomical deviations
    """
    if signer_params is None:
        signer_params = {
            'scale': 1.0,
            'bone_scale': 1.0,
            'spread_scale': 1.0,
            'noise_sigma': 0.008
        }

    scale = signer_params.get('scale', 1.0)
    bone_scale = signer_params.get('bone_scale', 1.0)
    spread_scale = signer_params.get('spread_scale', 1.0)
    noise_sigma = signer_params.get('noise_sigma', 0.008)

    if letter == 'BLANK':
        # Resting / relaxed palm with random gentle finger curves
        landmarks_21 = [np.array([0.0, 0.0, 0.0])]
        # Thumb
        t_cmc = ANATOMY['mcps']['thumb_cmc'] * scale
        landmarks_21.append(t_cmc)
        cur = t_cmc
        for b in ANATOMY['bone_lengths']['thumb']:
            cur = cur + np.array([-0.1, 0.2, 0.05]) * b * bone_scale + np.random.normal(0, 0.01, 3)
            landmarks_21.append(cur)
        # 4 fingers
        for f in ['index', 'middle', 'ring', 'pinky']:
            mcp = ANATOMY['mcps'][f'{f}_mcp'] * scale
            cur = mcp
            landmarks_21.append(cur)
            for b in ANATOMY['bone_lengths'][f]:
                cur = cur + np.array([0.0, 0.6, 0.2]) * b * bone_scale + np.random.normal(0, 0.01, 3)
                landmarks_21.append(cur)

        flat_63 = []
        for lm in landmarks_21:
            flat_63.extend(lm.tolist())
        return flat_63

    p = POSTURES[letter]
    curls = p['curls']
    spread = p['spread'] * spread_scale + random.gauss(0, 0.015)

    # Dynamic motion trajectory for J and Z
    motion_x, motion_y = 0.0, 0.0
    if p.get('motion') == 'J_SWOOP':
        # Downward hook (swoop down in Y, then curve up and in in X)
        motion_y = -math.sin(t_progress * math.pi) * 0.32
        motion_x = -math.sin(t_progress * math.pi * 0.6) * 0.20
    elif p.get('motion') == 'Z_ZIGZAG':
        # 3-stroke zigzag across normalized space
        if t_progress < 0.33:
            motion_x = (t_progress / 0.33) * 0.28
            motion_y = 0.0
        elif t_progress < 0.66:
            progress_mid = (t_progress - 0.33) / 0.33
            motion_x = 0.28 - progress_mid * 0.28
            motion_y = -progress_mid * 0.22
        else:
            progress_end = (t_progress - 0.66) / 0.34
            motion_x = progress_end * 0.28
            motion_y = -0.22

    # Forming phase interpolation for static signs (smooth transition from neutral)
    form_factor = min(1.0, t_progress / 0.25) if not p.get('motion') else 1.0

    landmarks_21 = []
    # 0: Wrist
    landmarks_21.append(np.array([0.0, 0.0, 0.0]))

    # 1-4: Thumb (CMC, MCP, IP, TIP)
    thumb_type = p.get('thumb', 'across_palm')
    t_cmc = ANATOMY['mcps']['thumb_cmc'] * scale + np.random.normal(0, noise_sigma, 3)
    landmarks_21.append(t_cmc)

    if thumb_type == 'wide_extended': # L, Y
        t_dir = np.array([-0.88, 0.32, 0.20])
    elif thumb_type == 'upright_along_index': # A
        t_dir = np.array([-0.28, 0.88, 0.22])
    elif thumb_type == 'curved_c': # C
        t_dir = np.array([-0.65, 0.42, -0.32])
    elif thumb_type == 'touch_index': # F
        t_dir = np.array([-0.22, 0.68, -0.22])
    elif thumb_type == 'touch_middle': # D
        t_dir = np.array([0.02, 0.64, -0.16])
    elif thumb_type == 'touch_all': # O
        t_dir = np.array([-0.18, 0.62, -0.32])
    elif thumb_type == 'between_index_mid': # K, P
        t_dir = np.array([-0.16, 0.82, 0.18])
    elif thumb_type == 'index_parallel': # G, Q
        t_dir = np.array([-0.30, 0.82, 0.10])
    elif thumb_type == 'front_across': # S (wrapped across front of knuckles)
        t_dir = np.array([0.30, 0.65, 0.45])
    elif thumb_type == 'tight_across': # E (folded low below clapped fingertips)
        t_dir = np.array([0.20, 0.32, 0.05])
    elif thumb_type == 'tuck_1': # T (between index and middle)
        t_dir = np.array([-0.10, 0.75, 0.32])
    elif thumb_type == 'tuck_2': # N (between middle and ring)
        t_dir = np.array([0.16, 0.75, 0.32])
    elif thumb_type == 'tuck_3': # M (between ring and pinky)
        t_dir = np.array([0.38, 0.70, 0.32])
    elif thumb_type == 'tucked_under_middle': # H
        t_dir = np.array([0.02, 0.42, -0.05])
    elif thumb_type == 'across_ring_pinky': # U
        t_dir = np.array([0.28, 0.52, 0.25])
    elif thumb_type == 'tucked_pinky': # W
        t_dir = np.array([0.38, 0.48, 0.20])
    else: # Across palm (B, I, J, V, X)
        t_dir = np.array([0.14, 0.46, 0.14])

    t_dir = t_dir / np.linalg.norm(t_dir)
    b_lens = [b * bone_scale for b in ANATOMY['bone_lengths']['thumb']]
    t_mcp = t_cmc + t_dir * b_lens[0]
    t_ip  = t_mcp + t_dir * b_lens[1]
    t_tip = t_ip  + t_dir * b_lens[2]
    landmarks_21.extend([t_mcp, t_ip, t_tip])

    # 4 Fingers: Index (5-8), Middle (9-12), Ring (13-16), Pinky (17-20)
    finger_keys = ['index', 'middle', 'ring', 'pinky']
    for idx, f_key in enumerate(finger_keys):
        mcp_base = ANATOMY['mcps'][f'{f_key}_mcp'].copy() * scale
        base_curl = curls[idx + 1]
        # Interpolate curl during forming phase
        effective_curl = 0.5 * (1.0 - form_factor) + base_curl * form_factor
        ext = 1.0 - effective_curl # 0.0 = curled into palm, 1.0 = extended straight
        f_lens = [b * bone_scale for b in ANATOMY['bone_lengths'][f_key]]

        # Spread angle
        spread_angle = (idx - 1.5) * spread * 0.8
        cos_s, sin_s = math.cos(spread_angle), math.sin(spread_angle)

        # Extended direction
        dir_ext = np.array([sin_s, cos_s, -0.05])
        # Curled direction (folds in toward palm in +Z / +Y)
        dir_curl = np.array([0.0, 0.15, 0.85])

        # Hooked index finger for X
        if p.get('hooked') and f_key == 'index':
            v1 = np.array([0.0, 0.55, 0.65]) * f_lens[0]
            v2 = np.array([0.0, -0.45, 0.45]) * f_lens[1]
            v3 = np.array([0.0, -0.65, -0.15]) * f_lens[2]
        # Crossed middle finger for R
        elif p.get('crossed') and f_key == 'middle':
            # Crosses over in front of index finger
            v1 = np.array([-0.25, 0.90, 0.12]) * f_lens[0]
            v2 = np.array([-0.28, 0.88, 0.14]) * f_lens[1]
            v3 = np.array([-0.28, 0.86, 0.16]) * f_lens[2]
        # Forward angled middle finger for K/P
        elif f_key == 'middle' and letter in ('K', 'P'):
            pitch_factor = 0.65 if letter == 'P' else 0.40
            v1 = np.array([0.05, 0.85, pitch_factor]) * f_lens[0]
            v2 = np.array([0.05, 0.85, pitch_factor]) * f_lens[1]
            v3 = np.array([0.05, 0.85, pitch_factor]) * f_lens[2]
        else:
            # Standard skeletal interpolation
            v1 = (dir_ext * ext + dir_curl * (1 - ext)) * f_lens[0]
            v2 = (dir_ext * ext + np.array([0, -0.3, 0.6]) * (1 - ext)) * f_lens[1]
            v3 = (dir_ext * ext + np.array([0, -0.5, 0.3]) * (1 - ext)) * f_lens[2]

        pip = mcp_base + v1
        dip = pip + v2
        tip = dip + v3

        # Apply letter specific motions (J/Z)
        if f_key == 'pinky' and letter == 'J':
            tip = tip + np.array([motion_x, motion_y, 0.0])
            dip = dip + np.array([motion_x * 0.7, motion_y * 0.7, 0.0])
        elif f_key == 'index' and letter == 'Z':
            tip = tip + np.array([motion_x, motion_y, 0.0])
            dip = dip + np.array([motion_x * 0.7, motion_y * 0.7, 0.0])

        # Micro-tremor noise on joints
        pip += np.random.normal(0, noise_sigma, 3)
        dip += np.random.normal(0, noise_sigma, 3)
        tip += np.random.normal(0, noise_sigma, 3)

        landmarks_21.extend([mcp_base, pip, dip, tip])

    # Flatten to 63 canonical coordinates
    flat_63 = []
    for lm in landmarks_21:
        flat_63.extend(lm.tolist())

    return flat_63

def generate_anatomical_sequence(letter, signer_params=None):
    """
    Generates a full 24-frame temporal sequence for a letter.
    """
    seq = []
    for t in range(SEQ_LEN):
        progress = t / float(SEQ_LEN - 1)
        coords = generate_anatomical_landmarks(letter, progress, signer_params)
        seq.append(coords)
    return seq

def create_dataset():
    """
    Builds signer-independent train, validation, and test datasets
    using anatomically grounded 63-D MediaPipe skeletal coordinates.
    """
    print(f"Generating anatomical dataset: 63-D pure canonical coordinates across 21 signers...")

    X_train, y_train = [], []
    X_val, y_val = [], []
    X_test, y_test = [], []

    # 1. Training Set (SIGNERS_TRAIN: 16 signers)
    for signer in SIGNERS_TRAIN:
        signer_seed = hash(signer) % 10000
        np.random.seed(signer_seed)
        random.seed(signer_seed)

        params = {
            'scale': random.uniform(0.92, 1.08),
            'bone_scale': random.uniform(0.94, 1.06),
            'spread_scale': random.uniform(0.85, 1.15),
            'noise_sigma': 0.008
        }

        for class_idx, letter in enumerate(CLASSES):
            # 12 sequences per class per training signer
            for _ in range(12):
                seq = generate_anatomical_sequence(letter, signer_params=params)
                X_train.append(seq)
                y_train.append(class_idx)

    # 2. Validation Set (SIGNERS_VAL: 3 unseen signers)
    for signer in SIGNERS_VAL:
        signer_seed = hash(signer) % 10000
        np.random.seed(signer_seed)
        random.seed(signer_seed)

        params = {
            'scale': random.uniform(0.90, 1.10),
            'bone_scale': random.uniform(0.92, 1.08),
            'spread_scale': random.uniform(0.80, 1.20),
            'noise_sigma': 0.009
        }

        for class_idx, letter in enumerate(CLASSES):
            # 6 sequences per class
            for _ in range(6):
                seq = generate_anatomical_sequence(letter, signer_params=params)
                X_val.append(seq)
                y_val.append(class_idx)

    # 3. Test Set (SIGNERS_TEST: 2 completely held-out signers)
    for signer in SIGNERS_TEST:
        signer_seed = hash(signer) % 10000
        np.random.seed(signer_seed)
        random.seed(signer_seed)

        params = {
            'scale': random.uniform(0.90, 1.10),
            'bone_scale': random.uniform(0.92, 1.08),
            'spread_scale': random.uniform(0.80, 1.20),
            'noise_sigma': 0.010
        }

        for class_idx, letter in enumerate(CLASSES):
            # 6 sequences per class
            for _ in range(6):
                seq = generate_anatomical_sequence(letter, signer_params=params)
                X_test.append(seq)
                y_test.append(class_idx)

    return (
        np.array(X_train, dtype=np.float32), np.array(y_train, dtype=np.int64),
        np.array(X_val, dtype=np.float32), np.array(y_val, dtype=np.int64),
        np.array(X_test, dtype=np.float32), np.array(y_test, dtype=np.int64)
    )

if __name__ == '__main__':
    X_tr, y_tr, X_va, y_va, X_te, y_te = create_dataset()
    print(f"Dataset generated successfully:")
    print(f"  Train: shape {X_tr.shape} ({len(X_tr)} sequences)")
    print(f"  Val:   shape {X_va.shape} ({len(X_va)} sequences)")
    print(f"  Test:  shape {X_te.shape} ({len(X_te)} sequences)")
