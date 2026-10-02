"""
SIGNQUEST — Temporal 1D CNN Training & Evaluation Pipeline
Trains the dilated residual temporal CNN on signer-independent partitions,
evaluates on held-out test signers, and exports production weights to JSON.
"""

import os
import sys
import time
import json
import random
import numpy as np

from generate_real_dataset import create_dataset, CLASSES, NUM_CLASSES, SEQ_LEN, FEATURE_DIM
from augment import augment_batch
from models import Temporal1DCNN

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(line_buffering=True)


def evaluate(model, X, y, batch_size=128):
    """
    Computes loss and categorical accuracy over a dataset split.
    """
    N = len(X)
    correct = 0
    total_loss = 0.0

    for i in range(0, N, batch_size):
        X_b = X[i:i + batch_size]
        y_b = y[i:i + batch_size]
        B = len(X_b)

        probs = model.forward(X_b)
        preds = np.argmax(probs, axis=1)
        correct += np.sum(preds == y_b)

        # Cross-entropy loss
        log_p = -np.log(np.maximum(probs[range(B), y_b], 1e-12))
        total_loss += np.sum(log_p)

    return total_loss / N, correct / float(N)

def train(epochs=25, batch_size=64, initial_lr=0.015):

    print("=" * 70)
    print("  SIGNQUEST TEMPORAL 1D CNN TRAINING")
    print(f"  Input: [{SEQ_LEN} frames, {FEATURE_DIM} features] -> Output: {NUM_CLASSES} classes")
    print("=" * 70)

    # 1. Dataset Generation
    random.seed(42)
    np.random.seed(42)
    X_train, y_train, X_val, y_val, X_test, y_test = create_dataset()
    print(f"Train samples: {len(X_train)} | Val samples: {len(X_val)} | Test samples: {len(X_test)}")

    model = Temporal1DCNN(in_channels=FEATURE_DIM, hidden=48, num_classes=NUM_CLASSES)

    lr = initial_lr
    best_val_acc = 0.0
    best_weights = None

    start_train_time = time.time()

    for epoch in range(1, epochs + 1):
        epoch_start = time.time()

        # Step LR schedule
        if epoch == 14:
            lr *= 0.5
        elif epoch == 20:
            lr *= 0.5

        # Shuffle training set
        indices = np.random.permutation(len(X_train))
        X_shuffled = X_train[indices]
        y_shuffled = y_train[indices]

        # Training epoch with online augmentation
        for b_idx in range(0, len(X_train), batch_size):
            X_batch = X_shuffled[b_idx:b_idx + batch_size].copy()
            y_batch = y_shuffled[b_idx:b_idx + batch_size]

            # Vectorized batch augmentation
            X_batch = augment_batch(X_batch)

            # Forward + Backward
            model.forward(X_batch)
            model.backward(X_batch, y_batch, lr=lr, beta=0.90)


        # Evaluation
        val_loss, val_acc = evaluate(model, X_val, y_val)
        train_loss, train_acc = evaluate(model, X_train[:500], y_train[:500])
        epoch_dur = time.time() - epoch_start

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_weights = {
                'W1': model.W1.copy(),
                'b1': model.b1.copy(),
                'W2': model.W2.copy(),
                'b2': model.b2.copy(),
                'W3': model.W3.copy(),
                'b3': model.b3.copy(),
                'W_head': model.W_head.copy(),
                'b_head': model.b_head.copy()
            }

        print(f"Epoch {epoch:02d}/{epochs:02d} [{epoch_dur:.2f}s] | "
              f"Train Loss: {train_loss:.4f} Acc: {train_acc*100:5.1f}% | "
              f"Val Loss: {val_loss:.4f} Acc: {val_acc*100:5.1f}% (Best: {best_val_acc*100:5.1f}%) | lr: {lr:.4f}")

    total_train_time = time.time() - start_train_time
    print(f"\nTraining completed in {total_train_time:.1f}s.")

    # Restore best weights
    if best_weights is not None:
        model.W1 = best_weights['W1']
        model.b1 = best_weights['b1']
        model.W2 = best_weights['W2']
        model.b2 = best_weights['b2']
        model.W3 = best_weights['W3']
        model.b3 = best_weights['b3']
        model.W_head = best_weights['W_head']
        model.b_head = best_weights['b_head']

    # 4. Rigorous Evaluation on Unseen Test Signers
    print("\n" + "=" * 70)
    print("  HELD-OUT TEST SET EVALUATION (Completely Unseen Signers)")
    print("=" * 70)

    test_loss, test_acc = evaluate(model, X_test, y_test)
    print(f"Overall Test Accuracy: {test_acc * 100:.2f}% (Loss: {test_loss:.4f})")

    # Detailed Per-Class Performance
    test_probs = model.forward(X_test)
    test_preds = np.argmax(test_probs, axis=1)

    per_class_acc = {}
    print("\nPer-Letter Accuracy on Unseen Signers:")
    for c_idx, letter in enumerate(CLASSES):
        mask = (y_test == c_idx)
        if np.sum(mask) > 0:
            c_acc = np.mean(test_preds[mask] == c_idx) * 100
            per_class_acc[letter] = c_acc
            status = "PASS" if c_acc >= 80.0 else "REVIEW"
            print(f"  {letter:5s}: {c_acc:5.1f}%  [{status}]")

    # Motion Letters Evaluation (J and Z)
    j_acc = per_class_acc.get('J', 0.0)
    z_acc = per_class_acc.get('Z', 0.0)
    print(f"\nMotion Letter Detection:")
    print(f"  J (Swoop Trajectory):  {j_acc:.1f}%")
    print(f"  Z (Zigzag Trajectory): {z_acc:.1f}%")

    # Latency Benchmark
    bench_x = X_test[:1]
    times = []
    for _ in range(500):
        t0 = time.perf_counter()
        _ = model.forward(bench_x)
        times.append((time.perf_counter() - t0) * 1000)
    avg_latency = np.mean(times)
    p95_latency = np.percentile(times, 95)
    print(f"\nForward Pass Latency (1 sequence):")
    print(f"  Average: {avg_latency:.3f} ms | p95: {p95_latency:.3f} ms")

    # 5. Export Production JSON Weights
    export_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "frontend", "src", "data", "fingerspell_temporal_weights.json"
    )
    export_path = os.path.abspath(export_path)
    os.makedirs(os.path.dirname(export_path), exist_ok=True)

    payload = {
        "version": "2.0.0-temporal-1d-cnn",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "architecture": "Temporal1DCNN",
        "in_channels": FEATURE_DIM,
        "hidden": 48,
        "seq_len": SEQ_LEN,
        "num_classes": NUM_CLASSES,
        "classes": CLASSES,
        "metrics": {
            "test_accuracy": float(test_acc),
            "j_accuracy": float(j_acc / 100.0),
            "z_accuracy": float(z_acc / 100.0),
            "latency_ms": float(avg_latency)
        },
        "weights": {
            "W1": model.W1.tolist(),
            "b1": model.b1.tolist(),
            "W2": model.W2.tolist(),
            "b2": model.b2.tolist(),
            "W3": model.W3.tolist(),
            "b3": model.b3.tolist(),
            "W_head": model.W_head.tolist(),
            "b_head": model.b_head.tolist()
        }
    }

    with open(export_path, 'w', encoding='utf-8') as f:
        json.dump(payload, f)

    file_size_kb = os.path.getsize(export_path) / 1024.0
    print(f"\nSaved production weights to: {export_path}")
    print(f"Weight payload size: {file_size_kb:.1f} KB")

if __name__ == '__main__':
    train()
