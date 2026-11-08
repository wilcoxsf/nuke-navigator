"""When in the game and the day each ball was hit (8 Nov 2026), as legal pre-contact features for the meta-learner: the evening cools and the marine layer comes in
as a night game goes on, and the game's weather is one snapshot. Columns (keyed by rid): inning; min_in, estimated minutes since first pitch (4 + 2.08 per plate
appearance before this one, as add_game_time.py); sun_hr, local mean solar hour at the ball (UTC start + min_in, shifted by longitude / 15); night (the schedule's
day/night flag). Written to data/derived/time_feats.parquet. Usage: python science/build_time_feats.py"""
import numpy as np
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
D = ROOT + "data/derived/"
b = pd.read_parquet(D + "bakeoff_features.parquet", columns=["rid", "game_pk", "inning", "at_bat_number"])
g = pd.read_parquet(ROOT + "data/raw/game_context/games.parquet", columns=["game_pk", "start_utc", "day_night", "lon"]).drop_duplicates("game_pk")  # (some games appear twice in the schedule pull)
b = b.merge(g, on="game_pk", how="left")
t0 = pd.to_datetime(b.start_utc, utc=True)
b["min_in"] = 4 + 2.08 * (b.at_bat_number.astype(float) - 1)
b["sun_hr"] = ((t0.dt.hour + t0.dt.minute / 60 + b.min_in / 60 + b.lon / 15) % 24).astype(float)
b["night"] = (b.day_night == "night").astype(float)
b["inning"] = b.inning.astype(float)
out = b[["rid", "inning", "min_in", "sun_hr", "night"]].drop_duplicates("rid")
out.to_parquet(D + "time_feats.parquet")
print("wrote time_feats.parquet", len(out), "rows; missing start time", int(t0.isna().sum()), "; sun hour quartiles", np.nanpercentile(out.sun_hr, [25, 50, 75]).round(1))
