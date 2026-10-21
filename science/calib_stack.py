"""Cheap post-hoc tests on existing predictions (no retraining):
  1. isotonic and Platt recalibration of the contact-surprise XGBoost (fitted on the validation period, scored on test);
  2. a stack of that XGBoost with the physics net and the older boosted models.
Writes pred files that paired.py can score against the baseline.

Usage: python calib_stack.py --data data/derived/bakeoff_features_v5r.parquet --pred data/derived/v5_v5r/pred_xgb.parquet --out-dir data/derived/v7_calib
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression

logit = lambda p: np.log(np.clip(p, 1e-6, 1 - 1e-6) / (1 - np.clip(p, 1e-6, 1 - 1e-6)))


def main() -> None:
    ap = argparse.ArgumentParser()
    for k in ("data", "pred", "out_dir"):
        ap.add_argument(f"--{k.replace('_', '-')}", required=True)
    a = ap.parse_args()
    out = Path(a.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    df = pd.read_parquet(a.data, columns=["rid", "split", "y"]).set_index("rid")
    p = pd.read_parquet(a.pred).set_index("rid").p_hr
    va, te = df.index[df.split == "val"], df.index[df.split == "test"]
    yv, yt = df.loc[va, "y"].to_numpy(), df.loc[te, "y"].to_numpy()
    pv, pt = p.reindex(va).to_numpy(), p.reindex(te).to_numpy()
    brier = lambda q: float(((q - yt) ** 2).mean())
    print(f"raw test Brier {brier(pt):.5f}")
    iso = IsotonicRegression(out_of_bounds="clip", y_min=1e-5, y_max=1 - 1e-5).fit(pv, yv)
    pi = iso.predict(pt)
    pl = LogisticRegression(C=1e6, max_iter=500).fit(logit(pv)[:, None], yv)
    pp = pl.predict_proba(logit(pt)[:, None])[:, 1]
    print(f"isotonic {brier(pi):.5f}, Platt {brier(pp):.5f}; Platt slope {pl.coef_[0][0]:.3f} intercept {pl.intercept_[0]:.3f}")
    for name, q in (("iso", pi), ("platt", pp)):
        pd.DataFrame({"rid": te, "p_hr": q}).to_parquet(out / f"pred_{name}.parquet")


if __name__ == "__main__":
    main()
