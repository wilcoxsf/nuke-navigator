"""Week-1 audit from GPT brief 7: what physical venue does each home team and season map to in our feature table? Prints, per home team and season, the venue ids, park dimensions, elevation and roof flag our features actually carry, flags teams whose venue id changes
or does not change when the real stadium did (Athletics to Sacramento in 2025, Tampa Bay to Steinbrenner Field in 2025 and back to Tropicana Field in 2026, Baltimore's left-field wall moved in 2025), and shows 2025-26 HR calibration by venue id.
Usage: python science/venue_audit.py"""
import numpy as np
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
cols = ["rid", "split", "y", "game_pk", "game_date", "game_year", "home_team", "venue_id", "elevation_ft", "roof", "dim_left_line", "dim_left_center", "dim_center", "dim_right_center", "dim_right_line", "om_temp_f", "plate_x", "plate_z"]
d = pd.read_parquet(ROOT + "data/derived/bakeoff_features_v5r.parquet", columns=cols)
d["home_team"] = d.home_team.astype(str)
d["roof"] = d.roof.astype(str)
pd.set_option("display.width", 250)
pd.set_option("display.max_rows", 500)
print("== venue ids and dimensions by home team and season for the teams in question")
for t in ("ATH", "OAK", "TB", "BAL", "SF", "COL"):
    g = d[d.home_team == t]
    if not len(g):
        print(t, "no rows")
        continue
    s = g.groupby("game_year").agg(games=("game_pk", "nunique"), venue=("venue_id", lambda v: ",".join(str(int(x)) for x in sorted(v.dropna().unique()))), elev=("elevation_ft", "median"),
                                   roof=("roof", lambda v: ",".join(sorted(set(v)))), LF=("dim_left_line", "median"), LC=("dim_left_center", "median"), CF=("dim_center", "median"), RC=("dim_right_center", "median"), RF=("dim_right_line", "median"), temp=("om_temp_f", "mean"))
    print("\n" + t)
    print(s.round(1).to_string())
print("\n== teams whose home venue id changes between seasons")
v = d.groupby(["home_team", "game_year"]).venue_id.agg(lambda x: tuple(sorted(x.dropna().unique())))
for t, g in v.groupby(level=0):
    seq = list(g.droplevel(0).items())
    ch = [(a[0], a[1], b[0], b[1]) for a, b in zip(seq[:-1], seq[1:]) if a[1] != b[1]]
    if ch:
        print(t, ["%d %s -> %d %s" % c for c in ch])
print("\n== 2025-26 home-run rate vs mean model-free expectation: HR per ball by venue id (test period)")
te = d[d.split == "test"]
r = te.groupby(["home_team", "venue_id"]).agg(n=("y", "size"), hr=("y", "sum"), rate=("y", "mean")).reset_index()
print(r[r.home_team.isin(["ATH", "TB", "BAL", "SF", "COL"])].round(4).to_string(index=False))
print("\n== plate_x and plate_z by season (the 2026 plate reference point changed, per Savant docs)")
print(d.groupby("game_year")[["plate_x", "plate_z"]].agg(["mean", "std"]).round(3).to_string())
