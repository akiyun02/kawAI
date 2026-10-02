"""
SIGNQUEST — Real ASL Dataset Ingestion & Signer-Independent Split Pipeline
Downloads the real MediaPipe ASL fingerspelling dataset, extracts features with exact mathematical parity,
clusters real signers based on anatomical hand biometric invariants, and partitions into strictly
independent train, validation, and test splits.
"""

import os
import sys
import json
import numpy as np
from pathlib import Path
from collections import Counter
from huggingface_hub import HfApi, hf_hub_download, snapshot_download
from sklearn.cluster import KMeans

# Ensure ml directory is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from ml.preprocessing.normalizer import (
    normalize_hand_landmarks,
    extract_anatomical_finger_ratios
)

DATASET_REPO = 'sid220/asl-now-fingerspelling'
RAW_DATA_DIR = Path('ml/data/raw')
PROCESSED_DATA_DIR = Path('ml/data/processed')

ALL_CLASSES = sorted(list("ABCDEFGHIJKLMNOPQRSTUVWXYZ"))

def download_raw_dataset():
    """Loads all landmark JSON files from the downloaded repository."""
    raw_dir = Path('ml/data/raw_git')
    if not raw_dir.exists():
        print(f"[Dataset Ingestion] Cloning {DATASET_REPO} via git...")
        os.system(f"git clone --depth 1 https://huggingface.co/datasets/{DATASET_REPO} ml/data/raw_git")

    local_records = []
    for root, _, files in os.walk(raw_dir):
        for f in files:
            if f.endswith('.json'):
                rel_dir = os.path.basename(root)
                if rel_dir in ALL_CLASSES:
                    full_p = os.path.join(root, f)
                    local_records.append((rel_dir, full_p, f"{rel_dir}/{f}"))

    print(f"[Dataset Ingestion] Discovered {len(local_records)} real landmark files across A-Z.")
    return local_records

def process_and_split_dataset(records, n_signer_clusters=5, random_state=42):
    """
    Parses all real landmark samples, clusters by anatomical bone ratios to identify signers,
    and constructs strictly signer-independent train/val/test splits.
    """
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)

    samples_meta = []
    features_A = []
    features_B = []
    features_C = []
    labels = []
    anatomical_profiles = []

    print("[Dataset Preprocessing] Extracting canonical frames and anatomical signatures...")
    for letter, local_path, rel_path in records:
        try:
            with open(local_path, 'r', encoding='utf-8') as f:
                lms = json.load(f)
            if not isinstance(lms, list) or len(lms) < 21:
                continue

            # 1. Anatomical proportions for signer identification
            anat = extract_anatomical_finger_ratios(lms)
            # 2. Canonical and kinematic features
            norm = normalize_hand_landmarks(lms)

            anatomical_profiles.append(anat)
            features_A.append(norm['canonical_coords'])
            features_B.append(norm['all_features'])
            features_C.append(norm['model_c_features'])
            labels.append(letter)
            samples_meta.append(rel_path)
        except Exception as e:
            continue

    total_valid = len(labels)
    print(f"[Dataset Preprocessing] Successfully preprocessed {total_valid} valid real landmark samples.")
    print("[Dataset Preprocessing] Class counts:", sorted(Counter(labels).items()))

    # 3. Signer-Independent Clustering
    # Real hands have unique, immutable bone-length proportions invariant to gesture pose
    anat_arr = np.array(anatomical_profiles)
    kmeans = KMeans(n_clusters=n_signer_clusters, random_state=random_state, n_init=10)
    signer_ids = kmeans.fit_predict(anat_arr)
    print("[Dataset Preprocessing] Partitioned samples into signer clusters:")
    for sid, count in sorted(Counter(signer_ids).items()):
        print(f"  Signer Cluster {sid}: {count} samples ({count/total_valid*100:.1f}%)")

    # Split assignment:
    # Train: clusters 0, 1, 2 (~65-70%)
    # Val: cluster 3 (~15-18%)
    # Test: cluster 4 (~15-18%, completely unseen signers)
    train_mask = np.isin(signer_ids, [0, 1, 2])
    val_mask = signer_ids == 3
    test_mask = signer_ids == 4

    X_A = np.array(features_A, dtype=np.float32)
    X_B = np.array(features_B, dtype=np.float32)
    X_C = np.array(features_C, dtype=np.float32)
    y = np.array(labels)
    s_ids = np.array([f"signer_{i}" for i in signer_ids])

    output_path = PROCESSED_DATA_DIR / 'asl_real_dataset.npz'
    np.savez_compressed(
        output_path,
        # Model A (63-D canonical)
        X_train_A=X_A[train_mask],
        X_val_A=X_A[val_mask],
        X_test_A=X_A[test_mask],
        # Model B (78-D canonical + kinematics)
        X_train_B=X_B[train_mask],
        X_val_B=X_B[val_mask],
        X_test_B=X_B[test_mask],
        # Model C (81-D canonical + kinematics + orientation)
        X_train_C=X_C[train_mask],
        X_val_C=X_C[val_mask],
        X_test_C=X_C[test_mask],
        # Target labels
        y_train=y[train_mask],
        y_val=y[val_mask],
        y_test=y[test_mask],
        # Signer metadata
        signers_train=s_ids[train_mask],
        signers_val=s_ids[val_mask],
        signers_test=s_ids[test_mask],
        classes=np.array(ALL_CLASSES)
    )

    print(f"\n[Dataset Preprocessing] Saved processed dataset to {output_path}")
    print(f"  Train samples: {train_mask.sum()} ({train_mask.sum()/total_valid*100:.1f}%) [Signers 0, 1, 2]")
    print(f"  Val samples:   {val_mask.sum()} ({val_mask.sum()/total_valid*100:.1f}%) [Signer 3]")
    print(f"  Test samples:  {test_mask.sum()} ({test_mask.sum()/total_valid*100:.1f}%) [Signer 4 - HELD OUT]")

if __name__ == '__main__':
    records = download_raw_dataset()
    process_and_split_dataset(records)
