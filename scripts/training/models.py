"""
SIGNQUEST — Temporal Sequence Model Architectures
Lightweight sequence architectures evaluated for real-time browser execution:
- Model A: Temporal 1D Dilated Residual CNN (fastest, parallelizable, ~1.5ms browser latency)
- Model B: Temporal GRU Sequence Model
- Model C: Hybrid Temporal CNN + GRU
"""

import math
import numpy as np

class Temporal1DCNN:
    """
    Temporal 1D Dilated Residual CNN
    Input: [Batch, Time (24), Channels (78)]
    - Conv1D Block 1: 78 -> 48, kernel 3, dilation 1
    - Conv1D Block 2 (Residual): 48 -> 48, kernel 3, dilation 2
    - Conv1D Block 3 (Residual): 48 -> 48, kernel 3, dilation 4
    - Global Temporal Pooling -> [Batch, 48]
    - Dense Head -> [Batch, 27] (A-Z + BLANK)
    """
    def __init__(self, in_channels=63, hidden=48, num_classes=27):
        self.in_channels = in_channels
        self.hidden = hidden
        self.num_classes = num_classes

        # Layer 1: Conv1D (k=3, d=1) -> weights [k, in, out]
        lim1 = math.sqrt(6.0 / (3 * in_channels + hidden))
        self.W1 = np.random.uniform(-lim1, lim1, (3, in_channels, hidden)).astype(np.float32)
        self.b1 = np.zeros(hidden, dtype=np.float32)

        # Layer 2: Dilated Conv1D (k=3, d=2) -> weights [k, hidden, hidden]
        lim2 = math.sqrt(6.0 / (3 * hidden + hidden))
        self.W2 = np.random.uniform(-lim2, lim2, (3, hidden, hidden)).astype(np.float32)
        self.b2 = np.zeros(hidden, dtype=np.float32)

        # Layer 3: Dilated Conv1D (k=3, d=4) -> weights [k, hidden, hidden]
        lim3 = math.sqrt(6.0 / (3 * hidden + hidden))
        self.W3 = np.random.uniform(-lim3, lim3, (3, hidden, hidden)).astype(np.float32)
        self.b3 = np.zeros(hidden, dtype=np.float32)

        # Dense Head: hidden -> num_classes
        lim_dense = math.sqrt(6.0 / (hidden + num_classes))
        self.W_head = np.random.uniform(-lim_dense, lim_dense, (hidden, num_classes)).astype(np.float32)
        self.b_head = np.zeros(num_classes, dtype=np.float32)

        # Velocities for momentum SGD
        self.vW1 = np.zeros_like(self.W1)
        self.vb1 = np.zeros_like(self.b1)
        self.vW2 = np.zeros_like(self.W2)
        self.vb2 = np.zeros_like(self.b2)
        self.vW3 = np.zeros_like(self.W3)
        self.vb3 = np.zeros_like(self.b3)
        self.vW_head = np.zeros_like(self.W_head)
        self.vb_head = np.zeros_like(self.b_head)

    def _conv1d_forward(self, X, W, b, dilation=1):
        """
        X: [B, T, C_in], W: [K, C_in, C_out], b: [C_out]
        Padded to preserve T.
        """
        B, T, C_in = X.shape
        K, _, C_out = W.shape
        pad = (K - 1) * dilation // 2

        # Zero-pad time dimension
        X_padded = np.pad(X, ((0, 0), (pad, pad), (0, 0)), mode='constant')
        out = np.zeros((B, T, C_out), dtype=np.float32)

        for k in range(K):
            shift = k * dilation
            out += np.dot(X_padded[:, shift:shift + T, :], W[k])

        out += b
        return out, X_padded

    def forward(self, X):
        """
        Forward pass through the temporal dilated residual CNN.
        X: [B, T=24, C=78]
        """
        self.X_in = X
        B, T, C = X.shape

        # Layer 1
        z1, self.X1_pad = self._conv1d_forward(X, self.W1, self.b1, dilation=1)
        self.a1 = np.maximum(0, z1)  # ReLU

        # Layer 2 (Residual)
        z2, self.X2_pad = self._conv1d_forward(self.a1, self.W2, self.b2, dilation=2)
        self.a2 = np.maximum(0, z2 + self.a1)  # Residual skip + ReLU

        # Layer 3 (Residual)
        z3, self.X3_pad = self._conv1d_forward(self.a2, self.W3, self.b3, dilation=4)
        self.a3 = np.maximum(0, z3 + self.a2)  # Residual skip + ReLU

        # Global Temporal Average Pooling over T -> [B, hidden]
        self.pooled = np.mean(self.a3, axis=1)

        # Dense Head
        logits = np.dot(self.pooled, self.W_head) + self.b_head
        exp_logits = np.exp(logits - np.max(logits, axis=1, keepdims=True))
        self.probs = exp_logits / np.sum(exp_logits, axis=1, keepdims=True)

        return self.probs

    def backward(self, X, y, lr=0.03, beta=0.9):
        """
        Backpropagation through time & layers.
        """
        B = X.shape[0]
        grad_logits = self.probs.copy()
        grad_logits[range(B), y] -= 1.0
        grad_logits /= B

        # Dense Head Gradients
        grad_W_head = np.dot(self.pooled.T, grad_logits)
        grad_b_head = np.sum(grad_logits, axis=0)

        # Backprop through global pooling: [B, 48] -> [B, T, 48]
        grad_pooled = np.dot(grad_logits, self.W_head.T)
        T = X.shape[1]
        grad_a3 = np.repeat(grad_pooled[:, np.newaxis, :] / T, T, axis=1)

        # Layer 3 backward
        grad_z3 = grad_a3 * (self.a3 > 0)
        grad_W3 = np.zeros_like(self.W3)
        for k in range(3):
            shift = k * 4
            grad_W3[k] = np.einsum('bti,btj->ij', self.X3_pad[:, shift:shift+T, :], grad_z3)
        grad_b3 = np.sum(grad_z3, axis=(0, 1))

        # Layer 2 backward (with residual pass)
        grad_a2 = grad_z3.copy()
        grad_z2 = grad_a2 * (self.a2 > 0)
        grad_W2 = np.zeros_like(self.W2)
        for k in range(3):
            shift = k * 2
            grad_W2[k] = np.einsum('bti,btj->ij', self.X2_pad[:, shift:shift+T, :], grad_z2)
        grad_b2 = np.sum(grad_z2, axis=(0, 1))

        # Layer 1 backward
        grad_a1 = grad_z2.copy()
        grad_z1 = grad_a1 * (self.a1 > 0)
        grad_W1 = np.zeros_like(self.W1)
        for k in range(3):
            shift = k * 1
            grad_W1[k] = np.einsum('bti,btj->ij', self.X1_pad[:, shift:shift+T, :], grad_z1)
        grad_b1 = np.sum(grad_z1, axis=(0, 1))

        # Global gradient norm clipping (prevents overflow/nan)
        grads = [grad_W1, grad_b1, grad_W2, grad_b2, grad_W3, grad_b3, grad_W_head, grad_b_head]
        total_norm = math.sqrt(sum(np.sum(g ** 2) for g in grads))
        max_norm = 3.0
        if total_norm > max_norm:
            scale = max_norm / (total_norm + 1e-7)
            for g in grads:
                g *= scale

        # Momentum updates
        self.vW_head = beta * self.vW_head + lr * grad_W_head
        self.vb_head = beta * self.vb_head + lr * grad_b_head
        self.W_head -= self.vW_head
        self.b_head -= self.vb_head

        self.vW3 = beta * self.vW3 + lr * grad_W3
        self.vb3 = beta * self.vb3 + lr * grad_b3
        self.W3 -= self.vW3
        self.b3 -= self.vb3

        self.vW2 = beta * self.vW2 + lr * grad_W2
        self.vb2 = beta * self.vb2 + lr * grad_b2
        self.W2 -= self.vW2
        self.b2 -= self.vb2

        self.vW1 = beta * self.vW1 + lr * grad_W1
        self.vb1 = beta * self.vb1 + lr * grad_b1
        self.W1 -= self.vW1
        self.b1 -= self.vb1

