"""Rolling retrain vs train-once (26 Oct 2026; the last untested lever from the saturation review). 2024 forward split, XGBoost on v19 features (bakeoff_features_fwd2024_v19.parquet).
  frozen   train to 2023-10-01, early stopping on the 2024-03-20..05-15 validation slice (the usual forward setup), predicts every 2024 test month
  rolling  before each test month: train on every ball before (month start - 28 days), early stopping on the 28 days before the month, predict that month
Writes data/derived/roll24_frozen/pred_xgb.parquet and data/derived/roll24_rolling/pred_xgb.parquet (validation rows from the frozen model in both, so the recalibration layer sees the same history), then compare with paired.py and posthoc_memory.py.
Usage: python science/rolling_retrain.py"""
import os
import subprocess
import sys

import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
D = ROOT + "data/derived/"
SRC = D + "bakeoff_features_fwd2024_v19.parquet"
TMP = D + "roll24_tmp/"
os.makedirs(TMP, exist_ok=True)
env = dict(os.environ, FEATSET="v19", SEED="0")
py = sys.executable


def bake(table, out):
    if os.path.exists(out + "/pred_xgb.parquet"):  # never read a stale file from the previous month if this fit crashes
        os.remove(out + "/pred_xgb.parquet")
    r = subprocess.run([py, ROOT + "science/bakeoff.py", "--data", table, "--out-dir", out, "--entrant", "xgb"], env=env, capture_output=True, text=True)
    print((r.stdout + r.stderr).strip().splitlines()[-1][:200], flush=True)
    return pd.read_parquet(out + "/pred_xgb.parquet")


df = pd.read_parquet(SRC)
date = pd.to_datetime(df.game_date)
frozen = pd.read_parquet(D + "roll24_frozen/pred_xgb.parquet") if os.path.exists(D + "roll24_frozen/pred_xgb.parquet") else bake(SRC, D + "roll24_frozen")
test = df.split == "test"
month = date.dt.to_period("M")
parts = [frozen[frozen.rid.isin(df.rid[df.split == "val"])]]
for m in sorted(month[test].unique()):
    start = max(m.start_time, date[test].min())
    cut = start - pd.Timedelta(days=28)
    t = df.copy()
    t["split"] = "drop"
    t.loc[date < cut, "split"] = "train"
    t.loc[(date >= cut) & (date < start), "split"] = "val"
    t.loc[test & (month == m), "split"] = "test"
    t = t[t.split != "drop"]
    done = TMP + "month_%s.parquet" % m  # each month is saved as it finishes, so a crash resumes here
    if os.path.exists(done):
        parts.append(pd.read_parquet(done))
        print("== month %s: cached" % m, flush=True)
        continue
    print("== month %s: train %d (to %s), val %d, test %d" % (m, (t.split == "train").sum(), cut.date(), (t.split == "val").sum(), (t.split == "test").sum()), flush=True)
    t.to_parquet(TMP + "table.parquet")
    p = bake(TMP + "table.parquet", TMP + "out")
    p = p[p.rid.isin(t.rid[t.split == "test"])]
    p.to_parquet(done)
    parts.append(p)
roll = pd.concat(parts)
os.makedirs(D + "roll24_rolling", exist_ok=True)
roll.to_parquet(D + "roll24_rolling/pred_xgb.parquet")
print("rolling rows %d (frozen %d)" % (len(roll), len(frozen)))
