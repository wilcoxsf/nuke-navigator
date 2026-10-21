"""Wall-crossing height (GPT's idea 3): fly every ball that can leave the park through the physics model and read off how high it is, and how steeply it is falling, when it
reaches the fence distance in the estimated direction. A home run needs height over the wall, not just distance past it: the same 385 ft ball is a home run when it is
still 40 ft up and a wall ball when it is dropping at 60 degrees.

Same physics as bakeoff_data.py (college-fitted drag and Magnus, spin from the college teacher, game air density, calm wind). Fence distance is fence_hat (the schedule's five
distances at the estimated bearing), wall height is Savant's measured height at that bearing (savant_fence_features.py output, matched by row id). New columns:
  h_fence     height (ft) when the ball's range first reaches fence_hat
  tan_fence   tangent of the descent angle there (positive = falling)
  clear_h     h_fence minus the wall height there (ft)
  lands_short 1 if the ball lands before reaching the fence distance
Usage: python fence_height.py --data data/derived/bakeoff_features_v5r.parquet --v4 data/derived/bakeoff_features_v4.parquet --college ... --params ... --out data/derived/bakeoff_features_v8.parquet
"""
from __future__ import annotations

import argparse
import json
import time

import numpy as np
import pandas as pd

from bakeoff_data import college_teacher
from flight_fit import AREA, FT, G, MASS, MPH, RAD, RHO
from flight_transfer import GROUP, GRP_DTYPE


def fly_to_fence(p, v0, theta, w_back, w_side, rho, rt, dt=0.02, tmax=9.0):
    """RK4 for many balls; returns height and tan(descent) at the first step where range >= rt (metres), NaN if the ball lands first."""
    c0, c1, a, b = p
    n = len(v0)
    q = 0.5 * rho * AREA / MASS
    h = np.stack([np.zeros(n), np.ones(n), np.zeros(n)], 1)
    r = np.stack([np.ones(n), np.zeros(n), np.zeros(n)], 1)
    ez = np.array([0.0, 0.0, 1.0])
    omega = w_back[:, None] * r + w_side[:, None] * ez
    wmag = np.linalg.norm(omega, axis=1)
    vel = v0[:, None] * (np.cos(theta)[:, None] * h + np.sin(theta)[:, None] * ez)
    pos = np.stack([np.zeros(n), np.zeros(n), np.full(n, 1.0)], 1)
    hf, tf = np.full(n, np.nan), np.full(n, np.nan)
    alive = np.ones(n, bool)

    def acc(vv):
        sp = np.linalg.norm(vv, axis=1) + 1e-9
        S = RAD * wmag / sp
        drag = -q[:, None] * (c0 + c1 * S)[:, None] * sp[:, None] * vv
        lift = q[:, None] * (a * S / (1 + b * S))[:, None] * sp[:, None] * np.cross(omega, vv) / (wmag[:, None] + 1e-9)
        return drag + lift + np.array([0.0, 0.0, -G])
    t = 0.0
    while t < tmax and alive.any():
        a1 = acc(vel); p2, v2 = pos + 0.5 * dt * vel, vel + 0.5 * dt * a1
        a2 = acc(v2); p3, v3 = pos + 0.5 * dt * v2, vel + 0.5 * dt * a2
        a3 = acc(v3); p4, v4 = pos + dt * v3, vel + dt * a3
        a4 = acc(v4)
        npos = pos + dt / 6 * (vel + 2 * v2 + 2 * v3 + v4)
        nvel = vel + dt / 6 * (a1 + 2 * a2 + 2 * a3 + a4)
        r0, r1 = np.hypot(pos[:, 0], pos[:, 1]), np.hypot(npos[:, 0], npos[:, 1])
        cross = alive & np.isnan(hf) & (r0 < rt) & (r1 >= rt)
        if cross.any():
            f = (rt[cross] - r0[cross]) / np.maximum(r1[cross] - r0[cross], 1e-9)
            hf[cross] = pos[cross, 2] + f * (npos[cross, 2] - pos[cross, 2])
            vh = np.hypot(nvel[cross, 0], nvel[cross, 1])
            tf[cross] = -nvel[cross, 2] / np.maximum(vh, 1e-6)
        pos, vel = npos, nvel
        alive &= pos[:, 2] > 0
        t += dt
    return hf, tf


def main() -> None:
    ap = argparse.ArgumentParser()
    for k in ("data", "v4", "college", "params", "out"):
        ap.add_argument(f"--{k}", required=True)
    a = ap.parse_args()
    t0 = time.time()
    df = pd.read_parquet(a.data)
    v4 = pd.read_parquet(a.v4, columns=["rid", "wallh_s"]).set_index("rid")
    df["wallh_s"] = v4.wallh_s.reindex(df.rid.to_numpy()).to_numpy()
    cfg = json.load(open(a.params))
    p, sign = np.array(cfg["params"]), cfg["sign"]
    teach = college_teacher(a.college, sign)
    can = ((df.launch_speed >= 70) & df.launch_angle.between(8, 55) & df.release_speed.notna() & df.fence_hat.notna()).to_numpy()
    idx = np.flatnonzero(can)
    hf, tf = np.full(len(df), np.nan, np.float32), np.full(len(df), np.nan, np.float32)
    rho_fill = float(df.air_density.median())
    for s in range(0, len(idx), 100_000):
        ii = idx[s:s + 100_000]
        sub = df.iloc[ii]
        mx = pd.DataFrame({"ExitSpeed": sub.launch_speed.to_numpy(), "Angle": sub.launch_angle.to_numpy(), "RelSpeed": sub.release_speed.to_numpy(), "side_r": sub.stand_r.to_numpy(),
                           "grp": pd.Categorical(sub.pitch_type.astype(str).map(GROUP).fillna("other").astype(str), dtype=GRP_DTYPE)})
        spin = {k: teach[k].predict(mx) for k in teach}
        h_, t_ = fly_to_fence(p, mx.ExitSpeed.to_numpy() * MPH, np.deg2rad(mx.Angle.to_numpy()), spin["w_back"], spin["w_side"], sub.air_density.fillna(rho_fill).to_numpy(),
                              sub.fence_hat.to_numpy() * FT)
        hf[ii], tf[ii] = h_ / FT, t_
        print(f"fence height {s + len(ii):,}/{len(idx):,} {time.time() - t0:.0f}s", flush=True)
    df["h_fence"], df["tan_fence"] = hf, tf
    df["clear_h"] = df.h_fence - df.wallh_s
    df["lands_short"] = np.where(can, np.isnan(hf).astype(np.float32), np.nan)
    df = df.drop(columns=["wallh_s"])
    print(df.loc[can, ["h_fence", "tan_fence", "clear_h", "lands_short"]].describe().T[["count", "mean", "std", "min", "max"]].round(2).to_string(), flush=True)
    live = can & (df.split == "train").to_numpy()
    for c in ("margin_hat", "h_fence", "clear_h"):
        x = df.loc[live, c].fillna(-50).to_numpy()
        print(c, "correlation with home run:", round(float(np.corrcoef(x, df.loc[live, "y"])[0, 1]), 4), flush=True)
    df.to_parquet(a.out)
    print("wrote", a.out, f"{time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
