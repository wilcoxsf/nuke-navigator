"""Collision geometry features (GPT's idea 7), from what is legally known at contact: the bat's velocity vector (speed, attack angle, attack direction), the pitch's velocity
vector at the plate (release speed, approach angles), and how far the exit speed falls from what those two vectors could give.
New columns: bat_vz, bat_vh, bat_vlat, p_vz, p_vh, rel_vz, rel_vh, ev_fit_res (exit speed minus a linear fit on pitch and bat speed, fitted on training balls),
ev_eff (exit speed over the collision ceiling 1.23 pitch + 0.2116... re-fit), and a mix angle: atan2 of (1+e) bat_vz minus e p_vz against (1+e) bat_vh minus e p_vh, with e = 0.2.
Usage: python collision_features.py --data data/derived/bakeoff_features_v5r.parquet --out data/derived/bakeoff_features_v9.parquet
"""
from __future__ import annotations

import argparse

import numpy as np
import pandas as pd


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    df = pd.read_parquet(a.data)
    aa, ad = np.deg2rad(df.attack_angle.astype("float32")), np.deg2rad(df.attack_direction.astype("float32"))
    s = np.where(df.stand_r == 1, 1.0, -1.0).astype("float32")
    bs, ps = df.bat_speed.astype("float32"), df.release_speed.astype("float32")
    va = np.deg2rad(df.vaa.astype("float32"))
    df["bat_vz"] = bs * np.sin(aa)
    df["bat_vh"] = bs * np.cos(aa) * np.cos(ad)
    df["bat_vlat"] = bs * np.cos(aa) * np.sin(ad) * s
    df["p_vz"] = ps * np.sin(va)
    df["p_vh"] = ps * np.cos(va)
    df["rel_vz"] = df.bat_vz - df.p_vz
    df["rel_vh"] = df.bat_vh + df.p_vh
    tr = ((df.split == "train") & bs.notna() & ps.notna() & df.launch_speed.notna()).to_numpy()
    A = np.column_stack([ps[tr], bs[tr], np.ones(tr.sum())])
    coef, *_ = np.linalg.lstsq(A, df.launch_speed.to_numpy()[tr], rcond=None)
    print("exit speed ~ pitch + bat + c:", np.round(coef, 3))
    df["ev_fit_res"] = df.launch_speed - (coef[0] * ps + coef[1] * bs + coef[2])
    df["ev_eff"] = df.launch_speed / (coef[0] * ps + coef[1] * bs).clip(lower=1)
    e = 0.2
    df["mix_angle"] = np.degrees(np.arctan2((1 + e) * df.bat_vz - e * df.p_vz, (1 + e) * df.bat_vh + e * df.p_vh))
    df["la_minus_mix"] = df.launch_angle - df.mix_angle
    new = ["bat_vz", "bat_vh", "bat_vlat", "p_vz", "p_vh", "rel_vz", "rel_vh", "ev_fit_res", "ev_eff", "mix_angle", "la_minus_mix"]
    print(df.loc[df.bat_speed.notna(), new].describe().T[["count", "mean", "std"]].round(2).to_string())
    print("correlation of launch angle with mix angle (balls with bat tracking):", round(float(df[["launch_angle", "mix_angle"]].corr().iloc[0, 1]), 3))
    df.to_parquet(a.out)
    print("wrote", a.out)


if __name__ == "__main__":
    main()
