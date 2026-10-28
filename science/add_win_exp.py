"""Adds the batting team's win chance before the pitch (Savant bat_win_exp) to every ball in apps/web/public/replay.json as "bwe", for the score bug's before-and-after bar.
Run after build_replay.py (exp_features.parquet does not carry the column, so it comes from the raw per-season Savant parquets). Joined on game, batter, pitcher, inning, half and
pitch number; a ball with no match keeps no "bwe" and the page shows the WPA swing alone. replay.json is derived from Statcast and git-ignored.
"""
import json
import duckdb

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
RAW = ROOT + "data/raw/statcast_2020_2026/statcast_bbe_{y}_raw.parquet"
P = ROOT + "apps/web/public/replay.json"

R = json.load(open(P, encoding="utf-8"))
balls = R["balls"] if isinstance(R, dict) else R
c = duckdb.connect()
src = " UNION ALL ".join(
    f"SELECT game_pk, batter, pitcher, inning, inning_topbot, pitch_number, bat_win_exp FROM read_parquet('{RAW.format(y=y)}')" for y in (2023, 2024, 2025, 2026))
rows = c.sql(f"SELECT * FROM ({src}) WHERE bat_win_exp <> ''").fetchall()
key = {}
for g, b, p, i, tb, pn, w in rows:
    key.setdefault((str(g), str(b), str(p), str(i), tb, str(pn)), set()).add(round(float(w), 3))
hit = amb = 0
n = lambda v: str(int(float(v))) if v is not None else None  # replay.json writes some integers as 10.0
for x in balls:
    k = (n(x.get("gm")), n(x.get("b")), n(x.get("p")), n(x.get("in")), x.get("tb"), n(x.get("pn")))
    v = key.get(k)
    if v and len(v) == 1:
        x["bwe"] = next(iter(v)); hit += 1
    elif v:
        amb += 1
json.dump(R, open(P, "w", encoding="utf-8"), separators=(",", ":"))
# a check that the join is right: before + change = after, within [0, 1], and the change agrees in sign with the home team's delta
bad = [x for x in balls if "bwe" in x and x.get("dwe") is not None and not (-0.001 <= x["bwe"] + (x["dwe"] if x["tb"] == "Bot" else -x["dwe"]) <= 1.001)]
print(f"{hit} of {len(balls)} balls matched, {amb} ambiguous, {len(bad)} with before + change outside 0..1")
