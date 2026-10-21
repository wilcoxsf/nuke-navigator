"""Model bake-off entrants. Every entrant trains on the same rows, early-stops on the same validation slice, and writes predictions
for validation and test rows so one scoring script can compare them (and stack them).

Predict mode: legal features only (checked against the leakage registry). Targets: home run (y) and projected distance on balls
that have one (hit_distance_sc).

Usage: python bakeoff.py --data data/derived/bakeoff_features.parquet --out-dir data/derived/bakeoff --entrant lgbm [--sample 0.1]
Entrants: logit, lgbm, lgbm_phys, xgb, cat, mlp
"""
from __future__ import annotations

import argparse
import os
import time
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

from features import assert_clean
from ladder import BASE0, BAT, CATS, HIST, PITCH, WX

L4 = BASE0 + WX + PITCH + HIST + ["bearing_hat"] + BAT
if os.environ.get("FEATSET", "v1") == "v2":  # round-2 survivors: contact point (H1) and contact quality (H4)
    from experiments import HID
    L4 = L4 + HID["H1"]["cols"] + HID["H4"]["cols"]
PHYS = ["phys_dist", "phys_hang", "fence_hat", "margin_hat", "park_lf", "park_cf", "park_rf"]
FEATS_PHYS = L4 + PHYS


def monotone(feats):
    return [1 if f == "launch_speed" else 0 for f in feats]


def fit_lgbm(df, feats, tr, va, seed=0):
    clf = lgb.LGBMClassifier(n_estimators=1500, learning_rate=0.05, num_leaves=63, min_child_samples=200, subsample=0.8, subsample_freq=1,
                             colsample_bytree=0.7, reg_lambda=2.0, monotone_constraints=monotone(feats), n_jobs=10, random_state=seed, verbose=-1)
    clf.fit(df.loc[tr, feats], df.loc[tr, "y"], eval_set=[(df.loc[va, feats], df.loc[va, "y"])], callbacks=[lgb.early_stopping(60, verbose=False)])
    dtr, dva = tr & df.hit_distance_sc.notna().to_numpy(), va & df.hit_distance_sc.notna().to_numpy()
    reg = lgb.LGBMRegressor(n_estimators=1500, learning_rate=0.05, num_leaves=63, min_child_samples=200, subsample=0.8, subsample_freq=1,
                            colsample_bytree=0.7, reg_lambda=2.0, n_jobs=10, random_state=seed, verbose=-1)
    reg.fit(df.loc[dtr, feats], df.loc[dtr, "hit_distance_sc"], eval_set=[(df.loc[dva, feats], df.loc[dva, "hit_distance_sc"])],
            callbacks=[lgb.early_stopping(60, verbose=False)])
    return clf, reg


def run_lgbm(df, feats, tr, va, ev, extra_resid=False):
    clf, reg = fit_lgbm(df, feats, tr, va)
    out = pd.DataFrame({"rid": df.loc[ev, "rid"].to_numpy(), "p_hr": clf.predict_proba(df.loc[ev, feats])[:, 1], "d_hat": reg.predict(df.loc[ev, feats])})
    info = {"hr_trees": int(clf.best_iteration_ or 0), "dist_trees": int(reg.best_iteration_ or 0)}
    if extra_resid:
        d = df.hit_distance_sc.to_numpy()
        ok_tr = tr & df.phys_dist.notna().to_numpy() & ~np.isnan(d)
        ok_va = va & df.phys_dist.notna().to_numpy() & ~np.isnan(d)
        r = lgb.LGBMRegressor(n_estimators=1500, learning_rate=0.05, num_leaves=31, min_child_samples=200, subsample=0.8, subsample_freq=1,
                              colsample_bytree=0.7, n_jobs=10, verbose=-1)
        r.fit(df.loc[ok_tr, feats], d[ok_tr] - df.phys_dist.to_numpy()[ok_tr], eval_set=[(df.loc[ok_va, feats], d[ok_va] - df.phys_dist.to_numpy()[ok_va])],
              callbacks=[lgb.early_stopping(60, verbose=False)])
        out["d_hat_resid"] = df.loc[ev, "phys_dist"].to_numpy() + r.predict(df.loc[ev, feats])
    return out, info


def run_logit(df, tr, va, ev):
    from sklearn.linear_model import LogisticRegression, Ridge

    def mat(d):
        v, a = d.launch_speed.to_numpy() / 100.0, d.launch_angle.to_numpy() / 30.0
        return np.column_stack([v, a, v * v, a * a, v * a, v**3, a**3, v * a * a, v * v * a, d.stand_r.to_numpy()])
    Xtr = mat(df[tr])
    clf = LogisticRegression(max_iter=500, C=10.0).fit(Xtr, df.loc[tr, "y"])
    dtr = tr & df.hit_distance_sc.notna().to_numpy()
    reg = Ridge(alpha=1.0).fit(mat(df[dtr]), df.loc[dtr, "hit_distance_sc"])
    Xe = mat(df[ev])
    return pd.DataFrame({"rid": df.loc[ev, "rid"].to_numpy(), "p_hr": clf.predict_proba(Xe)[:, 1], "d_hat": reg.predict(Xe)}), {}


def run_xgb(df, feats, tr, va, ev):
    import xgboost as xgb
    p = dict(tree_method="hist", enable_categorical=True, learning_rate=0.05, max_depth=8, min_child_weight=50, subsample=0.8,
             colsample_bytree=0.7, reg_lambda=2.0, n_estimators=1500, early_stopping_rounds=60, n_jobs=10, max_bin=256)
    clf = xgb.XGBClassifier(**p, eval_metric="logloss")
    clf.fit(df.loc[tr, feats], df.loc[tr, "y"], eval_set=[(df.loc[va, feats], df.loc[va, "y"])], verbose=False)
    dtr, dva = tr & df.hit_distance_sc.notna().to_numpy(), va & df.hit_distance_sc.notna().to_numpy()
    reg = xgb.XGBRegressor(**p, eval_metric="mae")
    reg.fit(df.loc[dtr, feats], df.loc[dtr, "hit_distance_sc"], eval_set=[(df.loc[dva, feats], df.loc[dva, "hit_distance_sc"])], verbose=False)
    return pd.DataFrame({"rid": df.loc[ev, "rid"].to_numpy(), "p_hr": clf.predict_proba(df.loc[ev, feats])[:, 1], "d_hat": reg.predict(df.loc[ev, feats])}), \
        {"hr_trees": int(clf.best_iteration), "dist_trees": int(reg.best_iteration)}


def run_cat(df, feats, tr, va, ev):
    from catboost import CatBoostClassifier, CatBoostRegressor, Pool
    cats = [f for f in feats if f in CATS]

    def frame(m):
        d = df.loc[m, feats].copy()
        for c in cats:
            d[c] = d[c].astype(str).fillna("NA")
        return d
    p = dict(iterations=1500, learning_rate=0.08, depth=8, l2_leaf_reg=3.0, thread_count=10, verbose=False, early_stopping_rounds=60, random_seed=0)
    clf = CatBoostClassifier(**p)
    clf.fit(Pool(frame(tr), df.loc[tr, "y"], cat_features=cats), eval_set=Pool(frame(va), df.loc[va, "y"], cat_features=cats))
    dtr, dva = tr & df.hit_distance_sc.notna().to_numpy(), va & df.hit_distance_sc.notna().to_numpy()
    reg = CatBoostRegressor(**p, loss_function="MAE")
    reg.fit(Pool(frame(dtr), df.loc[dtr, "hit_distance_sc"], cat_features=cats), eval_set=Pool(frame(dva), df.loc[dva, "hit_distance_sc"], cat_features=cats))
    Xe = Pool(frame(ev), cat_features=cats)
    return pd.DataFrame({"rid": df.loc[ev, "rid"].to_numpy(), "p_hr": clf.predict_proba(Xe)[:, 1], "d_hat": reg.predict(Xe)}), \
        {"hr_trees": int(clf.get_best_iteration()), "dist_trees": int(reg.get_best_iteration())}


def nn_inputs(df, feats, tr):
    """Standardized numerics (train statistics, clipped, missing -> 0 plus a missing flag), category codes, category sizes."""
    num = [f for f in feats if f not in CATS]
    cats = [f for f in feats if f in CATS]
    X = df[num].to_numpy(np.float32)
    mu, sd = np.nanmean(X[tr], 0), np.nanstd(X[tr], 0) + 1e-6
    Z = np.clip((X - mu) / sd, -6, 6)
    miss = [j for j in range(X.shape[1]) if np.isnan(X[:, j]).any()]
    Z = np.hstack([np.nan_to_num(Z, nan=0.0), np.isnan(X[:, miss]).astype(np.float32)]).astype(np.float32)
    C = np.stack([df[c].cat.codes.to_numpy().astype(np.int64) + 1 for c in cats], 1)
    ncat = [int(df[c].cat.categories.size) + 1 for c in cats]
    return Z, C, ncat


def run_mlp(df, feats, tr, va, ev, seeds=3, epochs=10):
    import torch
    import torch.nn as nn
    torch.set_num_threads(10)
    Z, C, ncat = nn_inputs(df, feats, tr)
    y = df.y.to_numpy(np.float32)
    d = df.hit_distance_sc.to_numpy(np.float32)
    dm = ~np.isnan(d)
    dmu, dsd = float(np.nanmean(d[tr])), float(np.nanstd(d[tr]))
    ds = np.nan_to_num((d - dmu) / dsd, nan=0.0).astype(np.float32)

    class Net(nn.Module):
        def __init__(self):
            super().__init__()
            self.emb = nn.ModuleList([nn.Embedding(n, min(16, n // 2 + 1)) for n in ncat])
            w = Z.shape[1] + sum(min(16, n // 2 + 1) for n in ncat)
            self.body = nn.Sequential(nn.Linear(w, 256), nn.SiLU(), nn.Dropout(0.1), nn.Linear(256, 128), nn.SiLU(), nn.Dropout(0.1),
                                      nn.Linear(128, 64), nn.SiLU())
            self.hr, self.dist = nn.Linear(64, 1), nn.Linear(64, 1)

        def forward(self, z, c):
            h = self.body(torch.cat([z] + [e(c[:, i]) for i, e in enumerate(self.emb)], 1))
            return self.hr(h).squeeze(1), self.dist(h).squeeze(1)

    Zt, Ct = torch.from_numpy(Z), torch.from_numpy(C)
    yt, dt_, dmt = torch.from_numpy(y), torch.from_numpy(ds), torch.from_numpy(dm.astype(np.float32))
    tri, vai, evi = np.flatnonzero(tr), np.flatnonzero(va), np.flatnonzero(ev)
    p_acc, d_acc, info = np.zeros(len(evi)), np.zeros(len(evi)), {}
    bce, huber = nn.BCEWithLogitsLoss(), nn.HuberLoss(reduction="none", delta=0.5)

    def predict(net, idx):
        net.eval()
        ps, dsx = [], []
        with torch.no_grad():
            for s in range(0, len(idx), 65536):
                ii = idx[s:s + 65536]
                a, b = net(Zt[ii], Ct[ii])
                ps.append(torch.sigmoid(a).numpy())
                dsx.append(b.numpy())
        return np.concatenate(ps), np.concatenate(dsx)

    for seed in range(seeds):
        torch.manual_seed(seed)
        rng = np.random.default_rng(seed)
        net = Net()
        opt = torch.optim.AdamW(net.parameters(), lr=2e-3, weight_decay=1e-5)
        steps = epochs * (len(tri) // 4096 + 1)
        sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=3e-3, total_steps=steps)
        best, best_state = 9.0, None
        for ep in range(epochs):
            net.train()
            perm = rng.permutation(tri)
            for s in range(0, len(perm), 4096):
                ii = perm[s:s + 4096]
                a, b = net(Zt[ii], Ct[ii])
                loss = bce(a, yt[ii]) + 0.5 * (huber(b, dt_[ii]) * dmt[ii]).sum() / (dmt[ii].sum() + 1)
                opt.zero_grad()
                loss.backward()
                opt.step()
                sched.step()
            pv, _ = predict(net, vai)
            vb = float(np.mean((pv - y[vai]) ** 2))
            print(f"  seed {seed} epoch {ep} val Brier {vb:.5f}", flush=True)
            if vb < best:
                best, best_state = vb, {k: v.clone() for k, v in net.state_dict().items()}
        net.load_state_dict(best_state)
        pe, de = predict(net, evi)
        p_acc += pe / seeds
        d_acc += (de * dsd + dmu) / seeds
        info[f"seed{seed}_val_brier"] = best
    return pd.DataFrame({"rid": df.loc[ev, "rid"].to_numpy(), "p_hr": p_acc, "d_hat": d_acc}), info


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--entrant", required=True)
    ap.add_argument("--sample", type=float, default=1.0, help="fraction of TRAIN rows (quick tests)")
    a = ap.parse_args()
    t0 = time.time()
    df = pd.read_parquet(a.data.replace("\\", "/"))
    if a.sample < 1:
        keep = (df.split != "train") | (np.random.default_rng(0).random(len(df)) < a.sample)
        df = df[keep].reset_index(drop=True)
    tr, va, ev = (df.split == "train").to_numpy(), (df.split == "val").to_numpy(), (df.split != "train").to_numpy()
    print(a.entrant, "train", int(tr.sum()), "val", int(va.sum()), "test", int((df.split == "test").sum()), flush=True)

    feats = L4 if a.entrant == "lgbm" else FEATS_PHYS
    if a.entrant != "logit":
        assert_clean(feats, job=a.entrant)
    if a.entrant == "logit":
        out, info = run_logit(df, tr, va, ev)
    elif a.entrant in ("lgbm", "lgbm_phys"):
        out, info = run_lgbm(df, feats, tr, va, ev, extra_resid=(a.entrant == "lgbm_phys"))
    elif a.entrant == "xgb":
        out, info = run_xgb(df, feats, tr, va, ev)
    elif a.entrant == "cat":
        out, info = run_cat(df, feats, tr, va, ev)
    elif a.entrant == "mlp":
        out, info = run_mlp(df, feats, tr, va, ev)
    else:
        raise SystemExit(f"unknown entrant {a.entrant}")
    out_dir = Path(a.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out.to_parquet(out_dir / f"pred_{a.entrant}.parquet")
    print(a.entrant, "done", info, f"{time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
