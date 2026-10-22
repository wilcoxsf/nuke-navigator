"""Builds the row sample that goes into the second GPT brief: about 7% of games (whole games, so within-game structure survives), every split, from the modeling table v9
(which already holds the contact-surprise and collision columns), plus the wall-crossing columns from v8 and our best single-model prediction for validation and test rows
(`p_xgb_v5r`, empty for training rows). MLB Statcast rows only: no college or wood-bat TrackMan data. Streams in batches to stay inside a small memory budget."""
import sys

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

D = "C:/Users/andrewwi/dev/nuke-navigator-new/data/derived/"
OUT = sys.argv[1]
FRAC, SEED = 0.07, 20261022

meta = pd.read_parquet(D + "bakeoff_features_v9.parquet", columns=["game_pk", "split"])
games = meta.drop_duplicates("game_pk")
rng = np.random.default_rng(SEED)
keep = set()
for sp, g in games.groupby("split"):
    ids = g.game_pk.to_numpy()
    keep.update(rng.choice(ids, size=int(round(FRAC * len(ids))), replace=False).tolist())
print("games kept", len(keep), "of", len(games))
del meta

pf = pq.ParquetFile(D + "bakeoff_features_v9.parquet")
parts = []
for b in pf.iter_batches(batch_size=100_000):
    df = b.to_pandas()
    parts.append(df[df.game_pk.isin(keep)])
    del df
s = pd.concat(parts, ignore_index=True)
del parts
v8 = pd.read_parquet(D + "bakeoff_features_v8.parquet", columns=["rid", "h_fence", "tan_fence", "clear_h", "lands_short"])
s = s.merge(v8, on="rid", how="left")
pr = pd.read_parquet(D + "v5_v5r/pred_xgb.parquet", columns=["rid", "p_hr"]).rename(columns={"p_hr": "p_xgb_v5r"})
s = s.merge(pr, on="rid", how="left")
s = s.sort_values(["game_date", "game_pk", "rid"]).reset_index(drop=True)
s.to_parquet(OUT, index=False, compression="zstd")
print("rows", len(s), "cols", s.shape[1], "HR rate", round(float(s.y.mean()), 4))
print(s.split.value_counts().to_dict())
print("test rows with a prediction:", int(s.loc[s.split == "test", "p_xgb_v5r"].notna().sum()), "of", int((s.split == "test").sum()))
