"""Fit a 3D baseball flight model to measured college TrackMan batted balls and ask how much spin is worth.

Forces: quadratic drag with Cd = c0 + c1*S and Magnus lift with CL = a*S/(1+b*S), S = r*omega/v.
Spin is split into backspin (axis to the right of the ball's path) and sidespin (vertical axis) from the measured
rate and axis: backspin = -rate*cos(axis), sidespin = rate*sin(axis); the sidespin sign is chosen by which sign
reproduces the measured curve (landing bearing minus launch direction).

Questions answered (held-out balls, grouped by game file):
  1. How well does physics with MEASURED spin predict distance, hang time and curve?
  2. What if spin is a constant (the "no spin information" case)?
  3. What if spin comes from a model that only sees contact and pitch information (a teacher)?
  4. How does a boosted-tree model with no physics compare?

Usage: python flight_fit.py <trackman_college_bbe.parquet> <out.md>
"""
from __future__ import annotations

import json
import sys

import duckdb
import lightgbm as lgb
import numpy as np
import pandas as pd
from scipy.optimize import least_squares
from sklearn.model_selection import GroupKFold

MPH, FT, RPM = 0.44704, 0.3048, 2 * np.pi / 60
G = 9.81
RHO, MASS, RAD = 1.2, 0.145, 0.0366
AREA = np.pi * RAD**2


def simulate(p, v0, theta, phi, w_back, w_side, z0, dt=0.01, tmax=9.0, rho=None):
    """Vectorised RK4 over many balls. Angles in radians, spin in rad/s, SI units, air density rho in kg/m^3 per ball
    (default 1.2 for all). Returns distance, hang time, bearing."""
    c0, c1, a, b = p
    n = len(v0)
    q = 0.5 * (np.full(n, RHO) if rho is None else rho) * AREA / MASS
    h = np.stack([np.sin(phi), np.cos(phi), np.zeros(n)], 1)          # horizontal heading (x right, y forward)
    r = np.stack([np.cos(phi), -np.sin(phi), np.zeros(n)], 1)         # to the right of the path
    ez = np.array([0.0, 0.0, 1.0])
    omega = w_back[:, None] * r + w_side[:, None] * ez
    wmag = np.linalg.norm(omega, axis=1)
    vel = v0[:, None] * (np.cos(theta)[:, None] * h + np.sin(theta)[:, None] * ez)
    pos = np.stack([np.zeros(n), np.zeros(n), z0], 1)
    t_land = np.full(n, np.nan)
    land = np.full((n, 2), np.nan)
    alive = np.ones(n, bool)

    def acc(vv):
        sp = np.linalg.norm(vv, axis=1) + 1e-9
        S = RAD * wmag / sp
        cd = c0 + c1 * S
        cl = a * S / (1 + b * S)
        drag = -q[:, None] * cd[:, None] * sp[:, None] * vv
        cross = np.cross(omega, vv)
        lift = q[:, None] * cl[:, None] * sp[:, None] * cross / (wmag[:, None] + 1e-9)
        return drag + lift + np.array([0.0, 0.0, -G])

    t = 0.0
    while t < tmax and alive.any():
        a1 = acc(vel)
        p2, v2 = pos + 0.5 * dt * vel, vel + 0.5 * dt * a1
        a2 = acc(v2)
        p3, v3 = pos + 0.5 * dt * v2, vel + 0.5 * dt * a2
        a3 = acc(v3)
        p4, v4 = pos + dt * v3, vel + dt * a3
        a4 = acc(v4)
        new_pos = pos + dt / 6 * (vel + 2 * v2 + 2 * v3 + v4)
        new_vel = vel + dt / 6 * (a1 + 2 * a2 + 2 * a3 + a4)
        hit = alive & (new_pos[:, 2] < 0) & (t > 0.05)
        if hit.any():
            f = pos[hit, 2] / (pos[hit, 2] - new_pos[hit, 2])
            land[hit] = pos[hit, :2] + f[:, None] * (new_pos[hit, :2] - pos[hit, :2])
            t_land[hit] = t + f * dt
            alive &= ~hit
        pos, vel = np.where(alive[:, None], new_pos, pos), np.where(alive[:, None], new_vel, vel)
        t += dt
    dist = np.hypot(land[:, 0], land[:, 1])
    bearing = np.degrees(np.arctan2(land[:, 0], land[:, 1]))
    return dist, t_land, bearing


def prep(df, sidesign):
    rad = np.deg2rad(df.HitSpinAxis.to_numpy())
    rate = df.HitSpinRate.to_numpy() * RPM
    return dict(v0=df.ExitSpeed.to_numpy() * MPH, theta=np.deg2rad(df.Angle.to_numpy()), phi=np.deg2rad(df.Direction.to_numpy()),
                w_back=-rate * np.cos(rad), w_side=sidesign * rate * np.sin(rad), z0=np.full(len(df), 1.0))


def main() -> None:
    src, out = sys.argv[1].replace("\\", "/"), sys.argv[2]
    df = duckdb.sql(f"SELECT * FROM read_parquet('{src}')").df()
    df = df.dropna(subset=["HitSpinRate", "HitSpinAxis", "Direction", "Bearing", "Distance", "HangTime", "ExitSpeed", "Angle"]).copy()
    df = df[(df.ExitSpeed.between(60, 125)) & (df.Angle.between(10, 55)) & (df.HitSpinRate.between(500, 6000)) & (df.Distance.between(180, 440))
            & (df.HangTime.between(1.5, 8))].reset_index(drop=True)
    df["side_r"] = (df.BatterSide == "Right").astype(float)
    df["pt"] = df.TaggedPitchType.astype("category")
    rng = np.random.default_rng(0)
    files = df["file"].unique()
    test_files = set(rng.choice(files, size=int(len(files) * 0.2), replace=False))
    te = df[df.file.isin(test_files)].reset_index(drop=True)
    tr = df[~df.file.isin(test_files)].reset_index(drop=True)
    print("fly-ball-ish balls:", len(df), "train", len(tr), "test", len(te), flush=True)

    # sidespin sign: pick the sign whose simulated curve matches Bearing - Direction on a small sample
    s = tr.sample(3000, random_state=1)
    p0 = np.array([0.34, 0.2, 2.0, 4.0])
    best = None
    for sign in (+1, -1):
        d, ht, br = simulate(p0, **prep(s, sign))
        curve = br - s.Direction.to_numpy()
        err = np.nanmean(np.abs(curve - (s.Bearing.to_numpy() - s.Direction.to_numpy())))
        print("sidespin sign", sign, "curve MAE", round(float(err), 3), flush=True)
        if best is None or err < best[1]:
            best = (sign, err)
    sign = best[0]

    fit = tr.sample(12000, random_state=2).reset_index(drop=True)
    pf = prep(fit, sign)

    def resid(p):
        d, ht, br = simulate(p, **pf)
        r1 = (d / FT - fit.Distance.to_numpy()) / 10.0
        r2 = (ht - fit.HangTime.to_numpy()) * 3.0
        r3 = (br - fit.Bearing.to_numpy()) / 3.0
        out = np.concatenate([r1, r2, r3])
        return np.nan_to_num(out, nan=10.0)

    cache = out.replace(".md", "_params.json")
    try:
        p = np.array(json.load(open(cache))["params"])
        print("using cached params", flush=True)
    except (OSError, KeyError, ValueError):
        sol = least_squares(resid, p0, bounds=([0.1, -1, 0.1, 0.0], [0.7, 2, 6, 30]), x_scale=[0.1, 0.5, 1, 3], diff_step=1e-2, max_nfev=25, verbose=0)
        p = sol.x
        json.dump({"params": p.tolist(), "sign": sign}, open(cache, "w"))
    print("fitted c0 c1 a b:", np.round(p, 4), flush=True)

    def score(spin_back, spin_side, name):
        pt = dict(prep(te, sign)); pt["w_back"] = spin_back; pt["w_side"] = spin_side
        d, ht, br = simulate(p, **pt)
        ok = np.isfinite(d)
        return {"name": name, "dist_mae": float(np.mean(np.abs(d[ok] / FT - te.Distance.to_numpy()[ok]))),
                "hang_mae": float(np.mean(np.abs(ht[ok] - te.HangTime.to_numpy()[ok]))),
                "curve_mae": float(np.mean(np.abs((br[ok] - te.Direction.to_numpy()[ok]) - (te.Bearing.to_numpy()[ok] - te.Direction.to_numpy()[ok]))))}

    pm = prep(te, sign)
    rows = [score(pm["w_back"], pm["w_side"], "Physics, measured spin")]
    mean_b, mean_s = float(prep(tr, sign)["w_back"].mean()), 0.0
    rows.append(score(np.full(len(te), mean_b), np.full(len(te), mean_s), "Physics, constant spin (no spin information)"))

    # teacher: predict backspin and sidespin from contact and pitch details (true launch direction available in this corpus)
    X = ["ExitSpeed", "Angle", "Direction", "RelSpeed", "PlateLocHeight", "PlateLocSide", "VertApprAngle", "side_r", "pt"]
    trp = prep(tr, sign)
    preds = {}
    for k, y in [("w_back", trp["w_back"]), ("w_side", trp["w_side"])]:
        m = lgb.LGBMRegressor(n_estimators=400, learning_rate=0.05, num_leaves=31, min_child_samples=50, subsample=0.8, subsample_freq=1,
                              colsample_bytree=0.8, verbose=-1, n_jobs=6)
        m.fit(tr[X], y)
        preds[k] = m.predict(te[X])
    rows.append(score(preds["w_back"], preds["w_side"], "Physics, spin predicted from contact and pitch details"))
    X2 = [x for x in X if x != "Direction"]
    for k, y in [("w_back", trp["w_back"]), ("w_side", trp["w_side"])]:
        m = lgb.LGBMRegressor(n_estimators=400, learning_rate=0.05, num_leaves=31, min_child_samples=50, subsample=0.8, subsample_freq=1,
                              colsample_bytree=0.8, verbose=-1, n_jobs=6)
        m.fit(tr[X2], y)
        preds[k] = m.predict(te[X2])
    rows.append(score(preds["w_back"], preds["w_side"], "Physics, spin predicted WITHOUT launch direction"))

    # boosted trees with no physics
    base = []
    for cols, nm in [(["ExitSpeed", "Angle", "Direction", "side_r"], "Boosted trees: speed, angle, direction, hand"),
                     (["ExitSpeed", "Angle", "Direction", "side_r", "RelSpeed", "PlateLocHeight", "PlateLocSide", "pt"], "Boosted trees: + pitch details")]:
        m = lgb.LGBMRegressor(n_estimators=500, learning_rate=0.05, num_leaves=31, min_child_samples=50, verbose=-1, n_jobs=6)
        m.fit(tr[cols], tr.Distance)
        base.append((nm, float(np.mean(np.abs(m.predict(te[cols]) - te.Distance)))))
    mh = lgb.LGBMRegressor(n_estimators=500, learning_rate=0.05, num_leaves=31, min_child_samples=50, verbose=-1, n_jobs=6)
    mh.fit(tr[["ExitSpeed", "Angle", "Direction", "side_r"]], tr.HangTime)

    L = ["# Flight model fitted to college TrackMan", "",
         f"{len(df):,} measured fly-ball-type batted balls (launch angle 10-55 degrees, 180-440 ft); fit on 12,000 of {len(tr):,} training balls, scored on {len(te):,} held-out balls from other games.",
         f"Fitted: Cd = {p[0]:.3f} + {p[1]:.3f}*S;  CL = {p[2]:.2f}*S / (1 + {p[3]:.2f}*S). Sidespin sign chosen: {sign:+d}.", "",
         "| Model | Distance MAE (ft) | Hang time MAE (s) | Curve MAE (deg) |", "|---|---|---|---|"]
    for r in rows:
        L.append(f"| {r['name']} | {r['dist_mae']:.1f} | {r['hang_mae']:.2f} | {r['curve_mae']:.2f} |")
    for nm, mae in base:
        L.append(f"| {nm} | {mae:.1f} | | |")
    L += ["", "Notes: no weather in this corpus (sea-level air density assumed), so some error is just altitude and temperature. "
          "Direction here is the TRUE launch direction, which a Predicted MLB model does not have; the row without it shows the cost."]
    open(out, "w", encoding="utf-8").write("\n".join(L) + "\n")
    json.dump({"params": p.tolist(), "sign": sign}, open(out.replace(".md", "_params.json"), "w"))
    print("\n".join(L))


if __name__ == "__main__":
    main()
