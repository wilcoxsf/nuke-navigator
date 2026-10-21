"""Adds era-correct fence geometry and wall height to the modeling table.

The classifiers so far knew the park only as a team label plus five current-era fence distances from the schedule, and never saw a wall height. Baseball Savant
publishes MLB-measured fence distance and height at five bearings for every park and season (data/derived/parks/savant_fence_by_year.csv, gathered by the
park-research pass). From it, for each ball (park, season, estimated bearing):
  venue       the park itself (not the team: the Athletics moved in 2025)
  fence_s     fence distance at bearing_hat, interpolated between the five measured bearings (-45, -22.5, 0, 22.5, 45 degrees; the gap bearings are assumed nominal)
  wallh_s     wall height at bearing_hat, interpolated the same way
  hmax_s      the park's highest wall that season
  margin_s    phys_dist minus fence_s
  req_margin  extra distance a wall of this height demands: wall height over the tangent of the ball's descent angle, which is estimated from the physics
              flight (vertical speed at landing about g*hang/2, horizontal speed at landing about 85% of distance/hang)
  net_margin  margin_s minus req_margin
Everything depends only on legal inputs (park, season, estimated bearing, the physics distance and hang time).

Usage: python savant_fence_features.py --data data/derived/bakeoff_features_v3.parquet --fence data/derived/parks/savant_fence_by_year.csv --out data/derived/bakeoff_features_v4.parquet
"""
from __future__ import annotations

import argparse

import numpy as np
import pandas as pd

NODES = np.array([-45.0, -22.5, 0.0, 22.5, 45.0])
FT = 0.3048
G = 9.81


def main() -> None:
    ap = argparse.ArgumentParser()
    for k in ("data", "fence", "out"):
        ap.add_argument(f"--{k}", required=True)
    a = ap.parse_args()
    df = pd.read_parquet(a.data)
    fe = pd.read_csv(a.fence)
    dcols = ["dist_lf_line", "dist_lf_gap", "dist_cf", "dist_rf_gap", "dist_rf_line"]
    hcols = ["height_lf_line", "height_lf_gap", "height_cf", "height_rf_gap", "height_rf_line"]
    tab = {(int(r.venue_id), int(r.season)): (r[dcols].to_numpy(float), r[hcols].to_numpy(float), float(r.height_highest)) for _, r in fe.iterrows()}
    seasons = {}
    for v, s in tab:
        seasons.setdefault(v, []).append(s)

    def lookup(v, y):
        if (v, y) in tab:
            return tab[(v, y)]
        if v in seasons:  # nearest measured season for this park
            return tab[(v, min(seasons[v], key=lambda s: abs(s - y)))]
        return None

    vy = df[["venue_id", "game_year"]].drop_duplicates()
    d5, h5, hm = {}, {}, {}
    miss = 0
    for v, y in vy.itertuples(index=False):
        got = lookup(int(v), int(y)) if pd.notna(v) else None
        if got is None:
            miss += 1
            continue
        d5[(v, y)], h5[(v, y)], hm[(v, y)] = got
    print("venue-season combinations", len(vy), "without a Savant row", miss)

    n = len(df)
    fence = np.full(n, np.nan, np.float32)
    wallh = np.full(n, np.nan, np.float32)
    hmax = np.full(n, np.nan, np.float32)
    b = df.bearing_hat.to_numpy(float)
    key = list(zip(df.venue_id.to_numpy(), df.game_year.to_numpy()))
    grp = pd.Series(range(n)).groupby(pd.Series(key)).indices
    for k, ix in grp.items():
        if k not in d5:
            continue
        ok = ix[~np.isnan(b[ix])]
        fence[ok] = np.interp(np.clip(b[ok], -45, 45), NODES, d5[k])
        wallh[ok] = np.interp(np.clip(b[ok], -45, 45), NODES, h5[k])
        hmax[ix] = hm[k]
    df["venue"] = df.venue_id.astype("Int64").astype(str).astype("category")
    df["fence_s"], df["wallh_s"], df["hmax_s"] = fence, wallh, hmax
    df["margin_s"] = df.phys_dist - df.fence_s
    hang = df.phys_hang.astype(float)
    dist_m = df.phys_dist.astype(float) * FT
    tan_desc = (G * hang / 2.0) / (0.85 * dist_m / hang)
    df["req_margin"] = (df.wallh_s.astype(float) / tan_desc.clip(lower=0.3)).astype(np.float32)
    df["net_margin"] = df.margin_s - df.req_margin
    print(df[["fence_s", "wallh_s", "hmax_s", "margin_s", "req_margin", "net_margin"]].describe().T[["count", "mean", "std", "min", "max"]].round(2).to_string())
    # sanity: correlation of net_margin and margin_hat with the outcome among balls that can leave the park
    live = df.phys_dist.notna() & df.margin_hat.notna() & (df.split == "train")
    for c in ("margin_hat", "margin_s", "net_margin"):
        print(c, "AUC-ish correlation with home run:", round(float(np.corrcoef(df.loc[live, c].fillna(0), df.loc[live, "y"])[0, 1]), 4))
    df.to_parquet(a.out)
    print("wrote", a.out, len(df), "rows", len(df.columns), "columns")


if __name__ == "__main__":
    main()
