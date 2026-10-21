"""T3: a structural home-run probability built from the distance and direction models.

For a ball the distance model says d_hat, the direction model says bearing_hat. If the real landing distance is Normal(d_hat, sigma_d) and the
real bearing is Normal(bearing_hat, sigma_b), the ball clears the fence when distance beats the fence at that bearing plus a wall allowance theta:

    P(home run) = integral over bearing of Phi((d_hat - fence(bearing) - theta) / sigma_d)

The fence is the park's five distances (left line, left-center, center, right-center, right line) interpolated by angle, the bearing integral is
a 9-node Gauss-Hermite quadrature, and three numbers (theta, sigma_d, sigma_b) are fitted on the validation slice by maximum likelihood.
Balls outside exit speed 85+ mph and launch angle 10-50 degrees (which hold every home run) keep the classifier probability.

Writes pred_structural.parquet next to a copy of the v2 predictions, scores them together, and reports the stack with and without it.

Usage: python structural.py --data data/derived/bakeoff_features_v2.parquet --games .../games.parquet --pred-dir data/derived/bakeoff_v2 --out science/structural_results.md
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from math import sqrt, pi
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.special import expit, ndtr

ANGLES = np.array([-45.0, -22.5, 0.0, 22.5, 45.0])
DIMS = ["dim_left_line", "dim_left_center", "dim_center", "dim_right_center", "dim_right_line"]
NODES, WEIGHTS = np.polynomial.hermite_e.hermegauss(9)
WEIGHTS = WEIGHTS / sqrt(2 * pi)


def fence_at(dims: np.ndarray, b: np.ndarray) -> np.ndarray:
    b = np.clip(b, -45, 45)
    idx = np.minimum(((b + 45) // 22.5).astype(int), 3)
    frac = (b - ANGLES[idx]) / 22.5
    rows = np.arange(len(dims))[:, None]
    return dims[rows, idx] * (1 - frac) + dims[rows, idx + 1] * frac


def p_struct(theta, sd, sb, d_hat, b_hat, dims):
    b = b_hat[:, None] + sb * NODES[None, :]
    f = fence_at(dims, b)
    return (ndtr((d_hat[:, None] - f - theta) / sd) * WEIGHTS[None, :]).sum(1)


def main() -> None:
    ap = argparse.ArgumentParser()
    for k in ("data", "games", "pred_dir", "out"):
        ap.add_argument(f"--{k.replace('_', '-')}", required=True)
    a = ap.parse_args()
    g = lambda p: p.replace("\\", "/")
    f = pd.read_parquet(g(a.data), columns=["rid", "split", "game_pk", "y", "launch_speed", "launch_angle", "home_team", "hit_distance_sc", "bearing_hat"])
    dims = duckdb.sql(f"SELECT DISTINCT ON (game_pk) game_pk, {', '.join(DIMS)} FROM read_parquet('{g(a.games)}') ORDER BY game_pk, official_date DESC").df()
    f = f.merge(dims, on="game_pk", how="left")
    xg = pd.read_parquet(Path(a.pred_dir) / "pred_xgb.parquet").set_index("rid")
    f = f[f.split != "train"].set_index("rid")
    f["d_hat"], f["p_xgb"] = xg.d_hat, xg.p_hr
    d = f[DIMS].to_numpy(float)
    d = np.where(np.isnan(d), np.nanmean(d, axis=0), d)
    region = ((f.launch_speed >= 85) & f.launch_angle.between(10, 50) & f.d_hat.notna() & f.bearing_hat.notna()).to_numpy()
    va, te = (f.split == "val").to_numpy(), (f.split == "test").to_numpy()
    y = f.y.to_numpy()

    def nll(x):
        th, sd, sb = x
        if sd < 3 or sb < 0.5:
            return 1e9
        p = np.clip(p_struct(th, sd, sb, f.d_hat.to_numpy()[va & region], f.bearing_hat.to_numpy()[va & region], d[va & region]), 1e-6, 1 - 1e-6)
        yy = y[va & region]
        return -(yy * np.log(p) + (1 - yy) * np.log(1 - p)).mean()

    best = minimize(nll, x0=[15.0, 14.0, 7.0], method="Nelder-Mead", options=dict(xatol=0.05, fatol=1e-7, maxiter=300))
    th, sd, sb = best.x
    print(f"fitted on validation: wall allowance {th:.1f} ft, distance spread {sd:.1f} ft, direction spread {sb:.1f} deg (nll {best.fun:.4f})", flush=True)

    ps = np.array(f.p_xgb.to_numpy(), dtype=float)
    ps[region] = p_struct(th, sd, sb, f.d_hat.to_numpy()[region], f.bearing_hat.to_numpy()[region], d[region])
    out = Path(a.pred_dir + "_plus")
    out.mkdir(exist_ok=True)
    for p in Path(a.pred_dir).glob("pred_*.parquet"):
        shutil.copy(p, out / p.name)
    pd.DataFrame({"rid": f.index.to_numpy(), "p_hr": ps, "d_hat": f.d_hat.to_numpy()}).to_parquet(out / "pred_structural.parquet")

    near = ((f.hit_distance_sc >= 330) & (f.hit_distance_sc <= 430)).to_numpy()
    e_s, e_x = (ps - y) ** 2, (f.p_xgb.to_numpy() - y) ** 2
    L = ["# T3: structural home-run probability", "",
         f"Fitted on the validation slice: wall allowance {th:.1f} ft, distance spread {sd:.1f} ft, direction spread {sb:.1f} degrees. Test: games from 2025-06-01 on.", "",
         "| Model | Brier (all test balls) | Near the wall |", "|---|---|---|",
         f"| XGBoost classifier | {e_x[te].mean():.5f} | {e_x[te & near].mean():.4f} |",
         f"| Structural (distance x direction x fence) | {e_s[te].mean():.5f} | {e_s[te & near].mean():.4f} |", ""]
    res = subprocess.run([sys.executable, "-W", "ignore", "bakeoff_score.py", "--data", g(a.data), "--pred-dir", str(out), "--out", "structural_stack.md", "--boot", "400"],
                         capture_output=True, text=True)
    rows = [ln for ln in res.stdout.splitlines() if ln.startswith("| stack") or ln.startswith("| structural") or ln.startswith("| xgb")]
    L += ["Scoreboard with the structural entrant added (stack fitted on validation, difference against LightGBM with a 95% interval over games):", "",
          "| Entrant | HR Brier | vs LightGBM | Near-wall | Oracle Park | vs ref at Oracle | AUC | Calibration error | Fly-ball distance MAE |", "|---|---|---|---|---|---|---|---|---|"] + rows
    Path(a.out).write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
