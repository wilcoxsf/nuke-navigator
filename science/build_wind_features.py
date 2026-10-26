"""v41 = v37 + the game-day weather the stadium itself reports (MLB Stats API, science/pull_game_weather.py): the wind as a STADIUM-RELATIVE vector, which the hourly reanalysis cannot give (it knows nothing about field orientation, shelter or roofs).
  wind_out    mph blowing toward the outfield (negative: blowing in); 'Out To CF' = +speed, 'Out To LF/RF' = +0.707*speed, 'In From CF' = -speed, 'In From LF/RF' = -0.707*speed, cross-winds 0
  wind_cross  mph blowing toward the right-field side (negative: toward left); 'L To R' = +speed, 'R To L' = -speed, 'Out To RF' = +0.707, 'Out To LF' = -0.707, 'In From LF' = +0.707, 'In From RF' = -0.707
  wind_mph    the reported speed        roof_closed  1 when the condition says Roof Closed or Dome        temp_gd  the reported temperature (F)
Known before the first pitch, so legal. Games with no report stay missing. Usage: python science/build_wind_features.py --base data/derived/bakeoff_features_v37.parquet --out data/derived/bakeoff_features_v41.parquet"""
import argparse
import re

import numpy as np
import pandas as pd

ap = argparse.ArgumentParser()
ap.add_argument("--base", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
w = pd.read_parquet(ROOT + "data/derived/game_weather_raw.parquet").drop_duplicates("game_pk")
S = 0.7071
VEC = {"out to cf": (1, 0), "out to lf": (S, -S), "out to rf": (S, S), "in from cf": (-1, 0), "in from lf": (-S, S), "in from rf": (-S, -S), "l to r": (0, 1), "r to l": (0, -1)}


def parse(txt):
    if not isinstance(txt, str):
        return (np.nan, np.nan, np.nan)
    m = re.match(r"\s*(\d+)\s*mph,\s*(.*)$", txt)
    if not m:
        return (np.nan, np.nan, np.nan)
    sp, d = float(m.group(1)), m.group(2).strip().lower()
    o, c = VEC.get(d, (0, 0))
    return (sp * o, sp * c, sp)


p = np.array([parse(x) for x in w.wind])
w["wind_out"], w["wind_cross"], w["wind_mph"] = p[:, 0], p[:, 1], p[:, 2]
w["roof_closed"] = w.condition.fillna("").str.lower().str.contains("roof closed|dome").astype(float)
w.loc[w.condition.isna(), "roof_closed"] = np.nan
w["temp_gd"] = pd.to_numeric(w.temp, errors="coerce")
df = pd.read_parquet(a.base)
m = w.set_index("game_pk")[["wind_out", "wind_cross", "wind_mph", "roof_closed", "temp_gd"]].reindex(df.game_pk.astype("int64").to_numpy())
for c in m.columns:
    df[c] = m[c].to_numpy()
print("games with a report:", int(w.wind_mph.notna().sum()), "of", len(w), "| balls covered:", round(float(df.wind_mph.notna().mean()), 4))
print(df[["wind_out", "wind_cross", "wind_mph", "roof_closed", "temp_gd"]].describe().T.round(2).to_string())
print("correlation of the stadium wind with the hourly reanalysis wind components (om_wind_u, om_wind_v):")
print(df[["wind_out", "wind_cross", "om_wind_u", "om_wind_v"]].corr().round(2).to_string())
df.to_parquet(a.out)
print("written", a.out, df.shape)
