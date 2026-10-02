import numpy as np

data = np.load('ml/data/processed/asl_real_dataset.npz')

y_all = np.concatenate([data['y_train'], data['y_val'], data['y_test']])
X_B_all = np.concatenate([data['X_train_B'], data['X_val_B'], data['X_test_B']])

fist_letters = ['A', 'E', 'M', 'N', 'S', 'T']
print("Features for fist letters (Model B 78D):")
for c in fist_letters:
    mask = (y_all == c)
    count = np.sum(mask)
    if count > 0:
        feats = X_B_all[mask]
        t_x = feats[:, 12].mean()
        t_y = feats[:, 13].mean()
        t_z = feats[:, 14].mean()
        i_curl = feats[:, 64].mean()
        m_curl = feats[:, 65].mean()
        r_curl = feats[:, 66].mean()
        p_curl = feats[:, 67].mean()
        p_idx_pip = feats[:, 76].mean()
        p_mid_tip = feats[:, 73].mean()
        p_ring_tip = feats[:, 74].mean()
        p_pinky_tip = feats[:, 75].mean()
        p_idx_tip = feats[:, 72].mean()
        print(f"{c} (N={count:2d}): thumbTip=[{t_x:+.2f}, {t_y:+.2f}, {t_z:+.2f}] | curls=[{i_curl:.2f}, {m_curl:.2f}, {r_curl:.2f}, {p_curl:.2f}] | proxIdxPip={p_idx_pip:.2f}, proxIdxTip={p_idx_tip:.2f}, proxMidTip={p_mid_tip:.2f}, proxRingTip={p_ring_tip:.2f}")
