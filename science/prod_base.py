"""Production base tables (9 Nov 2026): the research batted-ball table (data/derived/bbe_2015_2026_x.parquet) plus new games' raw Savant pulls, and the
schedule and weather for those games, written to data/prod/ so the whole feature chain can run there without touching the research tables.

THE LOCKBOX STAYS SEALED. Rows from --sealed raw directories (the 2026 postseason) are scored like any test row but their outcomes are never in the
working tables: is_home_run is set to FALSE (the feature query drops rows whose label is NULL, and a constant label makes any accidental metric on
these rows meaningless), and the outcome-bearing columns (events, description, hit_location, hc_x, hc_y, delta_home_win_exp, delta_run_exp) are NULL.
The true values go to data/prod/lockbox/sealed.parquet, which nothing in the pipeline reads; only score_lockbox.py --open does, when Andrew says so.
hit_distance_sc is kept: the in-game carry and the league drift features legally use the distances of EARLIER balls, as live scoring would.
Nothing here prints a rate, a count of home runs or any other outcome of a sealed row.

Usage: python science/prod_base.py --sealed data/raw/statcast_post2026 --games-new data/prod/game_context_post"""
import argparse
from pathlib import Path

import duckdb
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
ap = argparse.ArgumentParser()
ap.add_argument("--sealed", nargs="*", default=[], help="raw Savant directories whose outcomes stay sealed (the postseason)")
ap.add_argument("--games-new", default="", help="a pull_game_context.py output folder for the new games (games.parquet, game_weather.parquet)")
ap.add_argument("--out", default=ROOT + "data/prod/")
a = ap.parse_args()
out = Path(a.out); (out / "lockbox").mkdir(parents=True, exist_ok=True); (out / "game_context").mkdir(parents=True, exist_ok=True)

con = duckdb.connect(); con.sql("SET threads TO 3")
res = pd.read_parquet(ROOT + "data/derived/bbe_2015_2026_x.parquet")
cols = list(res.columns)
OUTCOME = ["events", "description", "hit_location", "hc_x", "hc_y", "delta_home_win_exp", "delta_run_exp"]
new_parts = []
for d in a.sealed:
    src = (Path(d) / "statcast_bbe_*_raw.parquet").as_posix()
    have = {r[0] for r in con.sql(f"DESCRIBE SELECT * FROM read_parquet('{src}')").fetchall()}
    # the same typed select as build_dataset.py (types taken from the research table), its de-duplication and its in-play filter, without its summary print
    dtypes = {c: str(res[c].dtype) for c in cols}
    sqlt = lambda c: {"int64": "BIGINT", "Int64": "BIGINT", "int32": "INTEGER", "Int32": "INTEGER", "float64": "DOUBLE", "bool": "BOOLEAN", "boolean": "BOOLEAN"}.get(dtypes[c], "VARCHAR")
    sel = []
    for c in cols:
        if c in ("game_year", "hawkeye", "is_home_run", "src"):
            continue
        if c == "game_date":
            sel.append("CAST(game_date AS DATE) AS game_date")
        elif c in have:
            sel.append(f"TRY_CAST({c} AS {sqlt(c)}) AS {c}")
        else:
            sel.append(f"CAST(NULL AS {sqlt(c)}) AS {c}")
    q = f"""SELECT * EXCLUDE (rn), year(game_date) AS game_year, (year(game_date) >= 2020) AS hawkeye, (events = 'home_run') AS is_home_run, '{Path(d).name}' AS src
            FROM (SELECT {', '.join(sel)}, row_number() OVER (PARTITION BY game_pk, at_bat_number, pitch_number) AS rn FROM read_parquet('{src}')
                  WHERE type = 'X' OR type IS NULL) WHERE rn = 1"""
    new_parts.append(con.sql(q).df())
new = pd.concat(new_parts, ignore_index=True) if new_parts else res.iloc[:0].copy()
for c in ("game_pk", "at_bat_number", "pitch_number"):
    new[c] = new[c].astype("int64")
new["game_date"] = pd.to_datetime(new.game_date).dt.date  # (the research table keeps dates as Python dates)
rk = set(zip(res.game_pk.astype("int64"), res.at_bat_number.astype("int64"), res.pitch_number.astype("int64")))
new = new[[k not in rk for k in zip(new.game_pk, new.at_bat_number, new.pitch_number)]].copy()
# seal: the outcomes to their own file, the working copy blind
key = ["game_pk", "at_bat_number", "pitch_number"]
new[key + OUTCOME + ["is_home_run"]].to_parquet(out / "lockbox" / "sealed.parquet")
for c in OUTCOME:
    new[c] = None
new["is_home_run"] = False
new["sealed"] = True
res["sealed"] = False
for c in new.columns:
    if c in res.columns and str(new[c].dtype) != str(res[c].dtype):
        try: new[c] = new[c].astype(res[c].dtype)
        except (TypeError, ValueError): pass
allb = pd.concat([res, new[res.columns]], ignore_index=True).sort_values(["game_date", "game_pk", "at_bat_number", "pitch_number"], kind="stable").reset_index(drop=True)
allb.to_parquet(out / "bbe_prod.parquet")
print(f"bbe_prod: {len(res):,} research rows + {len(new):,} sealed rows from {new.game_pk.nunique()} games -> {out / 'bbe_prod.parquet'}; outcomes sealed in {out / 'lockbox' / 'sealed.parquet'}")

# the schedule and the weather, research plus new
gc = ROOT + "data/raw/game_context/"
for f in ("games.parquet", "game_weather.parquet"):
    t = pd.read_parquet(gc + f)
    if a.games_new:
        n = pd.read_parquet(Path(a.games_new) / f)
        t = pd.concat([t, n[~n.game_pk.isin(t.game_pk)]], ignore_index=True)
    t.to_parquet(out / "game_context" / f)
    print(f, len(t), "rows")
miss = set(new.game_pk) - set(pd.read_parquet(out / "game_context" / "game_weather.parquet").game_pk)
print("sealed games without weather:", sorted(miss))
