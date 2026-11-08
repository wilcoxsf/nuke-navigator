"""In-game carry from fouls too (8 Nov 2026). Foul fly balls carry the same air as fair ones, and Statcast projects their distance. A plain distance model is fit
on fair fly balls of 2015-2022 (earlier than every scored period) from what fouls also have: exit speed, launch angle, air density, temperature, elevation.
Its residual on every fly ball (fair or foul, launch angle 15+, exit speed 80+) is that ball's unexplained carry. For each fair batted ball:
  gma  shrunk mean residual (k = 4) of the same game's EARLIER fly balls, fair and foul (order: at_bat_number, pitch_number)
  gmf  the same from earlier fouls only
  nfa  how many earlier fly balls (fair and foul) the game has had
Written to data/derived/gm_foul.parquet (rid, gma, gmf, nfa) for 2023-2026 balls. Usage: python science/build_foul_memory.py"""
import lightgbm as lgb
import numpy as np
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
D = ROOT + "data/derived/"
X = ["launch_speed", "launch_angle", "air_density", "om_temp_f", "elevation_ft"]
fair = pd.read_parquet(D + "bakeoff_features.parquet", columns=["rid", "game_pk", "game_date", "at_bat_number", "pitch_number"])
fair = fair.merge(pd.read_parquet(D + "bakeoff_features_v39c.parquet", columns=["rid", "launch_speed", "launch_angle", "hit_distance_sc", "air_density", "om_temp_f", "elevation_ft"]), on="rid")
fair["game_date"] = pd.to_datetime(fair.game_date)
fly = (fair.launch_angle >= 15) & (fair.launch_speed >= 80) & fair.hit_distance_sc.notna()
fit = fair[fly & (fair.game_date.dt.year <= 2022)]
mdl = lgb.train(dict(objective="regression_l1", learning_rate=0.05, num_leaves=63, min_data_in_leaf=200, verbose=-1, num_threads=8), lgb.Dataset(fit[X], fit.hit_distance_sc), 400)
print("distance model on %d fair fly balls 2015-2022" % len(fit))
# game-level weather for the fouls (one row per game from the fair table)
gw = fair.groupby("game_pk")[["air_density", "om_temp_f", "elevation_ft"]].first().reset_index()
fo = pd.read_parquet(ROOT + "data/raw/fouls/fouls_2023_2026.parquet", columns=["game_pk", "at_bat_number", "pitch_number", "launch_speed", "launch_angle", "hit_distance_sc"])
for c in ["launch_speed", "launch_angle", "hit_distance_sc", "at_bat_number", "pitch_number", "game_pk"]:
    fo[c] = pd.to_numeric(fo[c], errors="coerce")
fo = fo.dropna(subset=["game_pk", "at_bat_number", "pitch_number"]).merge(gw, on="game_pk", how="inner")
ffly = (fo.launch_angle >= 15) & (fo.launch_speed >= 80) & fo.hit_distance_sc.notna()
fo = fo[ffly].copy()
fo["res"] = fo.hit_distance_sc - mdl.predict(fo[X])
print("foul fly balls with game weather: %d; residual mean %+.1f ft sd %.1f" % (len(fo), fo.res.mean(), fo.res.std()))
fr = fair[fair.game_date.dt.year >= 2023].copy()
fr["res"] = np.where((fr.launch_angle >= 15) & (fr.launch_speed >= 80) & fr.hit_distance_sc.notna(), fr.hit_distance_sc - mdl.predict(fr[X]), np.nan)
print("fair fly residual (2023+): mean %+.1f ft sd %.1f" % (fr.res.mean(), fr.res.std()))
ev = pd.concat([fr[["game_pk", "at_bat_number", "pitch_number", "res", "rid"]].assign(foul=0), fo[["game_pk", "at_bat_number", "pitch_number", "res"]].assign(foul=1, rid=np.nan)])
ev = ev.sort_values(["game_pk", "at_bat_number", "pitch_number", "foul"], ascending=[True, True, True, False]).reset_index(drop=True)  # a ball's own fouls earlier in the at-bat come first by pitch number; a fair ball never precedes itself
r = ev.res.fillna(0.0).to_numpy(); ok = ev.res.notna().to_numpy().astype(float); rf = np.where(ev.foul == 1, r, 0.0); okf = np.where(ev.foul == 1, ok, 0.0)
g = ev.game_pk.to_numpy()
cs = lambda v: pd.Series(v).groupby(g).cumsum().to_numpy() - v
ev["gma"] = cs(r) / (cs(ok) + 4.0); ev["gmf"] = cs(rf) / (cs(okf) + 4.0); ev["nfa"] = cs(ok)
out = ev[ev.foul == 0][["rid", "gma", "gmf", "nfa"]]
out.to_parquet(D + "gm_foul.parquet"); print("wrote gm_foul.parquet", len(out), "fair balls; mean earlier fly balls per fair ball %.1f" % out.nfa.mean())
