"""Experiment E35: our own drag-dashboard. The MLB Drag Dashboard (a daily league-wide drag series, unreachable for us) exists because the ball and the air change from season to season and day to day. We can build the same thing from our own data:
for every ball, how much farther or shorter than the model expected did the balls hit in the previous days travel? The residual is r = carry label (E10, log, cached) minus carry_hat (E10, game-out-of-fold), averaged strictly over PAST days only:
  lg_carry14  league-wide, the 14 days before this ball's date (shrunk: sum / (n + 200)),   lg_n14  how many balls that is
  pk_carry30  this ball's home park, the 30 days before this ball's date (shrunk: sum / (n + 100)),   pk_n30  how many
Nothing from the ball's own day or later is used. New columns on top of v19 (FEATSET v35). Usage: python league_drift_features.py --v19 data/derived/bakeoff_features_v19.parquet --v10 data/derived/bakeoff_features_v10.parquet --out data/derived/bakeoff_features_v35.parquet. A minute."""
import argparse

import numpy as np
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
ap = argparse.ArgumentParser()
ap.add_argument("--v19", required=True)
ap.add_argument("--v10", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()
df = pd.read_parquet(a.v19)
x = pd.read_parquet(a.v10, columns=["rid", "carry_hat"])
assert len(x) == len(df) and (x.rid.to_numpy() == df.rid.to_numpy()).all()
logm = np.load(a.v10 + ".logm.npy")  # (9 Nov: beside the v10 table, as carry_features.py writes it; the research one is data/derived/bakeoff_features_v10.parquet.logm.npy)
r = logm - x.carry_hat.to_numpy()
ok = np.isfinite(r)
t = pd.DataFrame({"date": pd.to_datetime(df.game_date).dt.normalize(), "park": df.home_team.astype(str), "r": np.where(ok, r, 0.0), "n": ok.astype(float)})


def trailing(keys, window, k):
    g = t.groupby(keys + ["date"])[["r", "n"]].sum().reset_index()
    out = []
    for key, sub in (g.groupby(keys[0]) if keys else [(None, g)]):
        idx = pd.date_range(sub.date.min(), sub.date.max(), freq="D")
        d = sub.set_index("date")[["r", "n"]].reindex(idx, fill_value=0.0)
        roll = d.rolling(window, min_periods=1).sum().shift(1).fillna(0.0)  # the window ends the day BEFORE
        roll.index.name = "date"
        roll = roll.reset_index()
        if keys:
            roll[keys[0]] = key
        out.append(roll)
    R = pd.concat(out)
    m = t[keys + ["date"]].merge(R, on=keys + ["date"], how="left")
    return (m.r / (m.n + k)).to_numpy(), m.n.to_numpy()


df["lg_carry14"], df["lg_n14"] = trailing([], 14, 200.0)
df["pk_carry30"], df["pk_n30"] = trailing(["park"], 30, 100.0)
df.to_parquet(a.out)
te = df[(df.split == "test") & np.isfinite(r)]
rr = r[(df.split == "test").to_numpy() & ok]
print("written", a.out, df.shape, "| test balls: sd of lg_carry14 %.4f, sd of pk_carry30 %.4f; correlation of each with the ball's own carry residual: league %.3f, park %.3f" % (te.lg_carry14.std(), te.pk_carry30.std(), np.corrcoef(te.lg_carry14, rr)[0, 1], np.corrcoef(te.pk_carry30, rr)[0, 1]), flush=True)
