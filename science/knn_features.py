"""Experiment E25 (GPT brief-5 idea 21): similar real balls as a feature. For every near-wall fly ball (|margin_c| under 80 ft) the home-run rate of its 50 nearest TRAINING balls in a standardized space
(exit speed, launch angle, hand, air density, estimated bearing, carry-corrected margin), taken from OTHER GAMES only, and the mean neighbour distance (how typical the ball is). Test and validation balls
use training neighbours only (all past); training balls use the other-game training neighbours (a ball's own game is excluded, so its own outcome and its game-mates never inform its feature).
New columns on top of v10 (FEATSET v25): knn_hr, knn_d. Usage: python knn_features.py --data data/derived/bakeoff_features_v10.parquet --out data/derived/bakeoff_features_v25.parquet [--smoke]. About 10 minutes."""
import argparse

import numpy as np
import pandas as pd
from sklearn.neighbors import KDTree

ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--k", type=int, default=50)
ap.add_argument("--smoke", action="store_true")
a = ap.parse_args()
df = pd.read_parquet(a.data)
if a.smoke:
    df = df.sample(frac=0.04, random_state=1).sort_index().reset_index(drop=True)
elig = (df.margin_c.abs() < 80).to_numpy() & df.bearing_hat.notna().to_numpy() & (df.launch_speed >= 80).to_numpy() & df.air_density.notna().to_numpy()
X = np.column_stack([df.launch_speed, df.launch_angle, np.where(df.stand_r == 1, 1.0, -1.0) * 4.0, df.air_density * 40.0, df.bearing_hat * np.where(df.stand_r == 1, 1.0, -1.0) * 0.5, df.margin_c * 0.1])
sd = np.nanstd(X[elig], axis=0)
sd[sd == 0] = 1
Z = np.where(np.isfinite(X), X, 0.0) / sd * np.array([2.0, 1.5, 0.5, 1.0, 1.0, 3.0])  # margin and exit speed matter most for the neighbourhood
tr = (df.split == "train").to_numpy()
ref = np.flatnonzero(tr & elig)
tree = KDTree(Z[ref])
y = df.y.to_numpy(float)
games = df.game_pk.to_numpy()
rows = np.flatnonzero(elig)
knn_hr = np.full(len(df), np.nan)
knn_d = np.full(len(df), np.nan)
extra = 60  # extra neighbours so that same-game ones can be dropped and still leave k
CH = 20000
for s in range(0, len(rows), CH):
    ix = rows[s:s + CH]
    dist, nb = tree.query(Z[ix], k=a.k + extra)
    nbg = games[ref[nb]]
    ok = nbg != games[ix][:, None]  # other games only
    for r in range(len(ix)):
        sel = np.flatnonzero(ok[r])[:a.k]
        if len(sel) >= 20:
            knn_hr[ix[r]] = y[ref[nb[r, sel]]].mean()
            knn_d[ix[r]] = dist[r, sel].mean()
    print("  %d of %d balls" % (min(s + CH, len(rows)), len(rows)), flush=True)
df["knn_hr"] = knn_hr
df["knn_d"] = knn_d
df.to_parquet(a.out)
t = df[(df.split == "test") & df.knn_hr.notna()]
print("written", a.out, df.shape, "| test near-wall balls %d: correlation of knn_hr with the outcome %.3f, mean knn_hr %.3f vs actual rate %.3f" % (len(t), np.corrcoef(t.knn_hr, t.y)[0, 1], t.knn_hr.mean(), t.y.mean()), flush=True)
