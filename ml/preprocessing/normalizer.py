"""
SIGNQUEST — Canonical Landmark Normalizer & Feature Extractor (Python Parity Implementation)
100% mathematically compatible with frontend/src/services/recognition/landmarkNormalizer.ts
"""

import math
from typing import List, Dict, Tuple, Optional

def dist3d(p1: Dict[str, float], p2: Dict[str, float]) -> float:
    dx = p1['x'] - p2['x']
    dy = p1['y'] - p2['y']
    dz = p1.get('z', 0.0) - p2.get('z', 0.0)
    return math.sqrt(dx * dx + dy * dy + dz * dz)

def vector_sub(p2: Dict[str, float], p1: Dict[str, float]) -> Dict[str, float]:
    return {
        'x': p2['x'] - p1['x'],
        'y': p2['y'] - p1['y'],
        'z': p2.get('z', 0.0) - p1.get('z', 0.0)
    }

def dot3d(v1: Dict[str, float], v2: Dict[str, float]) -> float:
    return v1['x'] * v2['x'] + v1['y'] * v2['y'] + v1['z'] * v2['z']

def cross3d(v1: Dict[str, float], v2: Dict[str, float]) -> Dict[str, float]:
    return {
        'x': v1['y'] * v2['z'] - v1['z'] * v2['y'],
        'y': v1['z'] * v2['x'] - v1['x'] * v2['z'],
        'z': v1['x'] * v2['y'] - v1['y'] * v2['x']
    }

def normalize3d(v: Dict[str, float]) -> Dict[str, float]:
    length = math.sqrt(v['x'] * v['x'] + v['y'] * v['y'] + v['z'] * v['z']) or 1.0
    return {'x': v['x'] / length, 'y': v['y'] / length, 'z': v['z'] / length}

def infer_handedness(landmarks: List[Dict[str, float]]) -> str:
    if not landmarks or len(landmarks) < 21:
        return 'Right'
    wrist = landmarks[0]
    middle_mcp = landmarks[9]
    thumb_cmc = landmarks[1]

    palm_axis_x = middle_mcp['x'] - wrist['x']
    palm_axis_y = middle_mcp['y'] - wrist['y']
    thumb_vec_x = thumb_cmc['x'] - wrist['x']
    thumb_vec_y = thumb_cmc['y'] - wrist['y']

    cross = palm_axis_x * thumb_vec_y - palm_axis_y * thumb_vec_x
    return 'Right' if cross > 0 else 'Left'

def normalize_hand_landmarks(
    landmarks: List[Dict[str, float]],
    provided_handedness: Optional[str] = None
) -> Dict[str, any]:
    """
    Transforms 21 3D landmarks into invariant canonical coordinate frame and kinematic features.
    Matches frontend/src/services/recognition/landmarkNormalizer.ts line-by-line.
    """
    if len(landmarks) < 21:
        raise ValueError(f"Expected 21 landmarks, got {len(landmarks)}")

    handedness = provided_handedness or infer_handedness(landmarks)

    wrist = landmarks[0]
    thumb_tip = landmarks[4]
    index_mcp = landmarks[5]
    index_pip = landmarks[6]
    index_tip = landmarks[8]
    middle_mcp = landmarks[9]
    middle_pip = landmarks[10]
    middle_tip = landmarks[12]
    ring_mcp = landmarks[13]
    ring_pip = landmarks[14]
    ring_tip = landmarks[16]
    pinky_mcp = landmarks[17]
    pinky_pip = landmarks[18]
    pinky_tip = landmarks[20]

    # Palm scale: wrist to middle MCP
    palm_scale = dist3d(wrist, middle_mcp) or 0.18

    # 1. Canonical Coordinate Axes
    # Y-axis: wrist -> middle MCP (distal palm vector)
    y_axis_raw = vector_sub(middle_mcp, wrist)
    y_axis = normalize3d(y_axis_raw)

    # Knuckle transverse vector
    if handedness == 'Left':
        knuckle_raw = vector_sub(pinky_mcp, index_mcp)
    else:
        knuckle_raw = vector_sub(index_mcp, pinky_mcp)

    proj = dot3d(knuckle_raw, y_axis)
    x_axis_raw = {
        'x': knuckle_raw['x'] - proj * y_axis['x'],
        'y': knuckle_raw['y'] - proj * y_axis['y'],
        'z': knuckle_raw['z'] - proj * y_axis['z']
    }
    x_axis = normalize3d(x_axis_raw)

    # Z-axis: palm normal (X x Y)
    z_axis = normalize3d(cross3d(x_axis, y_axis))

    # 2. Project 21 landmarks into canonical 63-D coordinate vector
    canonical_coords: List[float] = []
    for i in range(21):
        rel = vector_sub(landmarks[i], wrist)
        canonical_coords.append(dot3d(rel, x_axis) / palm_scale)
        canonical_coords.append(dot3d(rel, y_axis) / palm_scale)
        canonical_coords.append(dot3d(rel, z_axis) / palm_scale)

    # 3. Kinematic Features (15-D)
    def calc_curl(tip: Dict[str, float], pip: Dict[str, float], mcp: Dict[str, float]) -> float:
        tip_to_wrist = dist3d(tip, wrist)
        pip_to_wrist = dist3d(pip, wrist)
        tip_to_mcp = dist3d(tip, mcp)
        ext_ratio = (tip_to_wrist / (pip_to_wrist * 1.25 + 0.001)) * 0.6 + (tip_to_mcp / (palm_scale * 0.85 + 0.001)) * 0.4
        return max(0.0, min(1.0, (1.10 - ext_ratio) / 0.65))

    thumb_curl = max(0.0, min(1.0, (1.20 - dist3d(thumb_tip, wrist) / palm_scale) / 0.55))
    index_curl = calc_curl(index_tip, index_pip, index_mcp)
    middle_curl = calc_curl(middle_tip, middle_pip, middle_mcp)
    ring_curl = calc_curl(ring_tip, ring_pip, ring_mcp)
    pinky_curl = calc_curl(pinky_tip, pinky_pip, pinky_mcp)

    spread_index_mid = dist3d(index_tip, middle_tip) / palm_scale
    spread_mid_ring = dist3d(middle_tip, ring_tip) / palm_scale
    spread_ring_pinky = dist3d(ring_tip, pinky_tip) / palm_scale
    spread_thumb_index = dist3d(thumb_tip, index_tip) / palm_scale

    palm_center = {
        'x': (wrist['x'] + middle_mcp['x']) / 2.0,
        'y': (wrist['y'] + middle_mcp['y']) / 2.0,
        'z': (wrist.get('z', 0.0) + middle_mcp.get('z', 0.0)) / 2.0
    }

    prox_index_tip = dist3d(thumb_tip, index_tip) / palm_scale
    prox_middle_tip = dist3d(thumb_tip, middle_tip) / palm_scale
    prox_ring_tip = dist3d(thumb_tip, ring_tip) / palm_scale
    prox_pinky_tip = dist3d(thumb_tip, pinky_tip) / palm_scale
    prox_index_pip = dist3d(thumb_tip, index_pip) / palm_scale
    prox_palm_center = dist3d(thumb_tip, palm_center) / palm_scale

    kinematic_features = [
        thumb_curl, index_curl, middle_curl, ring_curl, pinky_curl,
        spread_index_mid, spread_mid_ring, spread_ring_pinky, spread_thumb_index,
        prox_index_tip, prox_middle_tip, prox_ring_tip, prox_pinky_tip, prox_index_pip, prox_palm_center
    ]

    all_features = canonical_coords + kinematic_features

    # Optional Model C orientation features (3-D)
    knuckle_width = dist3d(index_mcp, pinky_mcp)
    aspect_ratio = knuckle_width / palm_scale
    # z_axis components encode 3D palm inclination in world camera space
    orientation_features = [aspect_ratio, z_axis['z'], y_axis['z']]
    model_c_features = all_features + orientation_features

    return {
        'canonical_coords': canonical_coords,         # Model A: 63
        'kinematic_features': kinematic_features,     # 15
        'all_features': all_features,                 # Model B: 78
        'model_c_features': model_c_features,         # Model C: 81
        'palm_scale': palm_scale,
        'palm_normal': z_axis,
        'handedness': handedness
    }

def extract_anatomical_finger_ratios(landmarks: List[Dict[str, float]]) -> List[float]:
    """
    Extracts scale-invariant bone-length ratios unique to an individual human hand.
    Used for signer clustering to ensure strict signer-independent splits.
    """
    wrist = landmarks[0]
    middle_mcp = landmarks[9]
    palm_len = dist3d(wrist, middle_mcp) or 0.18

    # Finger lengths normalized by palm length
    thumb_len = (dist3d(landmarks[1], landmarks[2]) + dist3d(landmarks[2], landmarks[3]) + dist3d(landmarks[3], landmarks[4])) / palm_len
    index_len = (dist3d(landmarks[5], landmarks[6]) + dist3d(landmarks[6], landmarks[7]) + dist3d(landmarks[7], landmarks[8])) / palm_len
    middle_len = (dist3d(landmarks[9], landmarks[10]) + dist3d(landmarks[10], landmarks[11]) + dist3d(landmarks[11], landmarks[12])) / palm_len
    ring_len = (dist3d(landmarks[13], landmarks[14]) + dist3d(landmarks[14], landmarks[15]) + dist3d(landmarks[15], landmarks[16])) / palm_len
    pinky_len = (dist3d(landmarks[17], landmarks[18]) + dist3d(landmarks[18], landmarks[19]) + dist3d(landmarks[19], landmarks[20])) / palm_len
    hand_span = dist3d(landmarks[5], landmarks[17]) / palm_len

    return [thumb_len, index_len, middle_len, ring_len, pinky_len, hand_span]
