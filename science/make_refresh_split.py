"""Refresh test (8 Nov 2026): would refitting the member models at the start of a season beat members frozen at the end of 2024? Rewrites a feature table's
split column so bakeoff.py trains on everything before --val-from, early-stops on --val-from..--test-from, and predicts --test-from onward; rows after
--test-from keep their original features. Only the split column changes.
Usage: python science/make_refresh_split.py --data <features.parquet> --out <new.parquet> --val-from 2025-09-01 --test-from 2026-01-01"""
import argparse

import numpy as np
import pandas as pd

ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--val-from", required=True); ap.add_argument("--test-from", required=True)
a = ap.parse_args()
d = pd.read_parquet(a.data)
gd = pd.to_datetime(d.game_date)
v0, t0 = pd.Timestamp(a.val_from), pd.Timestamp(a.test_from)
d["split"] = np.where(gd >= t0, "test", np.where(gd >= v0, "val", "train"))
d.to_parquet(a.out)
print(d.groupby("split").size().to_dict(), "->", a.out)
