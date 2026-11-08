"""Weather at the moment of each ball (8 Nov 2026), not the game average: SF wind builds through the afternoon and evenings cool. The hourly Open-Meteo
reanalysis cached by pull_game_context.py (data/raw/game_context/cache/weather/<venue>_<year>.json) is interpolated linearly to each ball's estimated time
(scheduled first pitch + 4 min + 2.08 min per earlier plate appearance, as add_game_time.py). Columns (keyed by rid): bw_temp, bw_u, bw_v (wind components, same
convention as game_weather: u = -speed sin(dir), v = -speed cos(dir)), bw_gust, and the departures from the game-window average d_temp, d_u, d_v.
Written to data/derived/ball_weather.parquet. Usage: python science/build_ball_weather.py"""
import glob
import json
import os

import numpy as np
import pandas as pd

EPOCH = pd.Timestamp("1970-01-01", tz="UTC")
hours = lambda t: ((t - EPOCH) / pd.Timedelta(hours=1)).to_numpy(dtype=float)  # (unit-safe: the parsed resolution varies)

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
D = ROOT + "data/derived/"
rows = []
for f in glob.glob(ROOT + "data/raw/game_context/cache/weather/*.json"):
    v = int(os.path.basename(f).split("_")[0])
    h = json.load(open(f))["hourly"]
    t = pd.to_datetime(pd.Series(h["time"]), utc=True)
    sp = np.array(h["wind_speed_10m"], dtype=float); dr = np.radians(np.array(h["wind_direction_10m"], dtype=float))
    rows.append(pd.DataFrame({"venue_id": v, "hr": np.round(hours(t)).astype("int64"), "temp": np.array(h["temperature_2m"], dtype=float),
                              "u": -sp * np.sin(dr), "vv": -sp * np.cos(dr), "gust": np.array(h["wind_gusts_10m"], dtype=float)}))
H = pd.concat(rows).drop_duplicates(["venue_id", "hr"])
print("hourly rows", len(H))
b = pd.read_parquet(D + "bakeoff_features.parquet", columns=["rid", "game_pk", "venue_id", "at_bat_number"])
g = pd.read_parquet(ROOT + "data/raw/game_context/games.parquet", columns=["game_pk", "start_utc"]).drop_duplicates("game_pk")
b = b.merge(g, on="game_pk", how="left")
t_ball = pd.to_datetime(b.start_utc, utc=True) + pd.to_timedelta(4 + 2.08 * (b.at_bat_number.astype(float) - 1), unit="m")
x = hours(t_ball)
b["h0"] = np.floor(x).astype("int64"); b["fr"] = x - b.h0
b["venue_id"] = b.venue_id.astype(int)
A = b.merge(H.rename(columns={"hr": "h0"}), on=["venue_id", "h0"], how="left")
B = b.assign(h1=b.h0 + 1).merge(H.rename(columns={"hr": "h1"}), on=["venue_id", "h1"], how="left")
fr = b.fr.to_numpy()
out = pd.DataFrame({"rid": b.rid.to_numpy()})
for c, o in (("temp", "bw_temp"), ("u", "bw_u"), ("vv", "bw_v"), ("gust", "bw_gust")):
    out[o] = (1 - fr) * A[c].to_numpy() + fr * B[c].to_numpy()
gw = pd.read_parquet(ROOT + "data/raw/game_context/game_weather.parquet", columns=["game_pk", "om_temp_f", "om_wind_u", "om_wind_v"]).drop_duplicates("game_pk")
gg = b[["rid", "game_pk"]].merge(gw, on="game_pk", how="left")
out["d_temp"] = out.bw_temp - gg.om_temp_f.to_numpy(); out["d_u"] = out.bw_u - gg.om_wind_u.to_numpy(); out["d_v"] = out.bw_v - gg.om_wind_v.to_numpy()
out = out.drop_duplicates("rid")
out.to_parquet(D + "ball_weather.parquet")
print("wrote ball_weather.parquet", len(out), "rows; missing", int(out.bw_temp.isna().sum()), "; temperature departure sd %.2f F, wind departure sd u %.2f v %.2f mph" % (out.d_temp.std(), out.d_u.std(), out.d_v.std()))
