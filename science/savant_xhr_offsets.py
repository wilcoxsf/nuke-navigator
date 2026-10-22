"""Can Savant's per-park would-be-HR counts be matched by shifting each park's fence distance by a constant? Same pipeline as savant_xhr_compare2.py (each ball matched to its observed
Statcast distance, flown at each park's pressure), but every park is evaluated at fence offsets from -40 to +40 ft in 5 ft steps. For each park the offset that minimizes the summed
absolute per-batter difference from Savant is reported, with the correlation and total ratio there. A big offset says Savant's park geometry (or method) differs from ours there;
a near-zero offset with a bad total says something else. Runs at below-normal priority, about 10 minutes. Output: data/derived/savant_xhr_offsets.csv.
"""
import json

import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import ROOT, SAV, clears, fly_path

OFFS = np.arange(-40, 41, 5)


def main():
    df = pd.read_parquet(ROOT + "data/derived/exp_features.parquet",
                         columns=["game_date", "game_year", "type", "batter", "launch_speed", "launch_angle", "bearing", "air_density", "om_pressure_hpa", "stand_r", "y", "hit_distance_sc"])
    df = df[(df.game_year == 2025) & (df.game_date <= "2025-09-28") & (df.type == "X") & (df.launch_speed >= 80) & df.launch_angle.between(12, 55)
            & df.bearing.between(-45, 45) & df.air_density.notna()].reset_index(drop=True)
    df["p_ball"] = df.om_pressure_hpa.fillna(1005.0)
    d = df[df.hit_distance_sc.ge(290) | (df.hit_distance_sc.isna() & (df.launch_speed >= 90))].reset_index(drop=True)
    print("candidates:", len(d), flush=True)
    hand = np.where(d.stand_r == 1, 1.0, -1.0)
    la, br = d.launch_angle.to_numpy(), d.bearing.to_numpy()
    base = dict(v0=d.launch_speed.to_numpy() * MPH, theta=np.deg2rad(la), phi=np.deg2rad(br), w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=(-hand * 849 - 94 * br) * RPM)
    rho0, target = d.air_density.to_numpy(), d.hit_distance_sc.to_numpy()
    has = ~np.isnan(target)
    CH = 4000
    lo, hi = np.full(len(d), 0.2), np.full(len(d), 1.8)
    for it in range(10):
        mid = 0.5 * (lo + hi)
        dist = np.zeros(len(d))
        for s in range(0, len(d), CH):
            sl = slice(s, s + CH)
            R, _ = fly_path(rho=rho0[sl] * mid[sl], **{k: v[sl] for k, v in base.items()})
            dist[sl] = R[:, -1] / FT
        too_far = dist > np.nan_to_num(target, nan=1e9)
        lo, hi = np.where(too_far, mid, lo), np.where(too_far, hi, mid)
    m = np.where(has, 0.5 * (lo + hi), 1.0)
    print("calibrated", flush=True)

    parks = json.load(open(ROOT + "apps/web/public/parks30.json"))
    B = np.array(parks["bearings"])
    alias = {"az": "ari", "ath": "oak", "cha": "cws", "was": "wsh"}
    pk = [(p, alias.get(p["abbr"].lower(), p["abbr"].lower())) for p in parks["parks"]]
    pk = [(p, c) for p, c in pk if c in SAV]
    cls = np.digitize(np.array([p["hpa"] for p, _ in pk]), [900, 982, 994, 1002, 1009])
    pball = d.p_ball.to_numpy()
    cnt = {c: np.zeros((len(d), len(OFFS)), bool) for _, c in pk}
    for ci in np.unique(cls):
        members = [pk[i] for i in range(len(pk)) if cls[i] == ci]
        hcls = float(np.mean([p["hpa"] for p, _ in members]))
        for s in range(0, len(d), CH):
            sl = slice(s, s + CH)
            R, Z = fly_path(rho=rho0[sl] * m[sl] * hcls / pball[sl], **{k: v[sl] for k, v in base.items()})
            for p, c in members:
                fence = np.interp(br[sl], B, p["dist"]) * FT
                wall = np.interp(br[sl], B, p["height"]) * FT
                for j, o in enumerate(OFFS):
                    cnt[c][sl, j] = clears(R, Z, fence + o * FT, wall)
        print("  pressure class", ci, [c for _, c in members], flush=True)

    sv = pd.read_csv(ROOT + "scratch/savant_xhr_2025_batters.csv").set_index("player_id")
    rows = []
    for _, c in pk:
        g = pd.DataFrame(cnt[c].astype(np.int32), columns=OFFS)
        g["batter"] = d.batter.to_numpy()
        per = g.groupby("batter").sum()
        j = per.join(sv[[c]], how="inner")
        s_ = j[c].to_numpy(float)
        errs = [float(np.abs(j[o].to_numpy(float) - s_).sum()) for o in OFFS]
        best = int(np.argmin(errs))
        o_best = OFFS[best]
        rows.append(dict(park=c, savant_total=int(s_.sum()), ours_at_0=int(j[0].sum()), ratio_at_0=round(float(j[0].sum() / s_.sum()), 3), best_offset_ft=int(o_best),
                         ratio_at_best=round(float(j[o_best].sum() / s_.sum()), 3), corr_at_best=round(float(np.corrcoef(j[o_best].to_numpy(float), s_)[0, 1]), 3),
                         mae_at_0=round(errs[list(OFFS).index(0)] / len(j), 2), mae_at_best=round(errs[best] / len(j), 2)))
    r = pd.DataFrame(rows).sort_values("best_offset_ft")
    print(r.to_string(index=False))
    print("\nmedian best offset %.1f ft; share of parks within +-10 ft: %.2f" % (r.best_offset_ft.median(), (r.best_offset_ft.abs() <= 10).mean()))
    r.to_csv(ROOT + "data/derived/savant_xhr_offsets.csv", index=False)


if __name__ == "__main__":
    main()
