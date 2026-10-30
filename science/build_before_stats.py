"""STATS BEFORE THIS SHOT for every DINGER DEJA-VU ball (29 Oct, evening, Andrew: "Each batter should have a 'stats before this shot' button that you can click and it
shows allllllll of their stats right before that point ... Separate by normal stats, nerd stats, and masochist stats").
Two sources, both up to the moment before the swing in the same season:
  * the line on the back of his card (games, hits, walks, strikeouts, AVG/OBP/SLG...) from his MLB game logs (Stats API, one batched call per season and 45 players,
    pruned with `fields`; cached in data/raw/gamelogs/, git-ignored). Game logs are per game, so these count every game BEFORE the day of the shot; the same day's
    earlier at-bats are not in them (the batted-ball tables below do include them).
  * the batted-ball numbers (exit velocity, barrels, spray, swing...) from the Savant batted-ball tables already on disk (data/raw/statcast_2020_2026), exact to the
    plate appearance before this one, the same game's earlier balls included.
Each replay ball is matched to its Savant row on (game, batter, pitcher, inning, half, pitch number), as in add_game_time.py.
Output: apps/web/public/before_stats.json (git-ignored), one row per ball in replay.json's order; rerun after build_replay.py.
Network rules (andrew-web-research): the official Stats API, an identified User-Agent, 2 s between calls, stop at the first HTTP error; nothing is fetched twice.
Usage: .venv/Scripts/python.exe science/build_before_stats.py"""
import datetime as dt
import json
import math
import os
import time
import urllib.error
import urllib.request

import duckdb

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
RAW = ROOT + "data/raw/statcast_2020_2026/statcast_bbe_{y}_raw.parquet"
LOGS = ROOT + "data/raw/gamelogs/"
UA = {"User-Agent": "nuke-navigator-research/0.1 (personal project)"}
KEYS = ["gamesPlayed", "plateAppearances", "atBats", "runs", "hits", "doubles", "triples", "homeRuns", "rbi", "baseOnBalls", "intentionalWalks", "strikeOuts", "hitByPitch",
        "stolenBases", "caughtStealing", "sacFlies", "sacBunts", "groundOuts", "airOuts", "groundIntoDoublePlay", "leftOnBase", "numberOfPitches", "totalBases"]
R = json.load(open(ROOT + "apps/web/public/replay.json", encoding="utf-8"))
balls = R["balls"]
seasons = sorted({int(b["d"][:4]) for b in balls})
ids = sorted({int(b["b"]) for b in balls})

# ---- game logs: cached per season and batch ----
os.makedirs(LOGS, exist_ok=True)
calls = 0
logs = {}  # (batter, season) -> [(date, {stat})]
for y in seasons:
    for k in range(0, len(ids), 45):
        path = LOGS + "%d_%03d.json" % (y, k // 45)
        if not os.path.exists(path):
            url = ("https://statsapi.mlb.com/api/v1/people?personIds=" + ",".join(map(str, ids[k:k + 45])) + "&hydrate=stats(group=[hitting],type=[gameLog],season=%d)" % y
                   + "&fields=people,id,stats,splits,date,gameType,game,gamePk,stat," + ",".join(KEYS))
            if calls:
                time.sleep(2.0)
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                    open(path, "wb").write(r.read())
            except urllib.error.HTTPError as e:
                raise SystemExit("stopping: HTTP %d on %s" % (e.code, path))
            calls += 1
        for p in json.load(open(path)).get("people", []):
            for st in p.get("stats", []):
                for sp in st.get("splits", []):
                    if sp.get("gameType", "R") == "R":
                        logs.setdefault((p["id"], y), []).append((sp["date"], sp["stat"]))
print("game-log calls made:", calls, "| batter-seasons with games:", len(logs), flush=True)

# ---- the batted balls ----
c = duckdb.connect()
cols = ("game_date, game_pk, batter, pitcher, inning, inning_topbot, pitch_number, at_bat_number, events, bb_type, launch_speed, launch_angle, launch_speed_angle, "
        "estimated_ba_using_speedangle, estimated_woba_using_speedangle, woba_value, hit_distance_sc, bat_speed, swing_length, attack_angle, release_speed, hc_x, hc_y, stand, game_type")
idl = ",".join(map(str, ids))
# each game's first pitch, to put a doubleheader's two games in order (29 Oct red team: game 1 was dropped from game 2's "before")
start = {str(g): str(t) for g, t in c.sql(f"SELECT game_pk, start_utc FROM read_parquet('{ROOT}data/raw/game_context/games.parquet')").fetchall()}
rows = c.sql(" UNION ALL ".join(f"SELECT {cols} FROM read_parquet('{RAW.format(y=y)}') WHERE batter IN ({idl})" for y in seasons)).fetchall()
names = [x.strip() for x in cols.split(",")]
bbe = {}
for r in rows:
    d = dict(zip(names, r))
    d["game_date"] = str(d["game_date"])[:10]
    for k in names[4:]:  # the raw tables keep numbers as text
        if k in ("inning_topbot", "events", "bb_type", "stand", "game_type"):
            continue
        v = d[k]
        try:
            d[k] = None if v is None or v == "" else float(v)
        except (TypeError, ValueError):
            d[k] = None
    bbe.setdefault((int(d["batter"]), int(d["game_date"][:4])), []).append(d)
num = lambda v: None if v is None or (isinstance(v, float) and math.isnan(v)) else v
key = lambda g, b, p, i, tb, pn: (str(int(float(g))), str(int(float(b))), str(int(float(p))), str(int(float(i))), tb, str(int(float(pn))))
where = {}
for (b, y), L in bbe.items():
    for d in L:
        where.setdefault(key(d["game_pk"], d["batter"], d["pitcher"], d["inning"], d["inning_topbot"], d["pitch_number"]), d)

r3 = lambda v, n=3: None if v is None else round(v, n)
def rate(a, b, n=3):
    return r3(a / b, n) if b else None
def mean(v, n=1):
    v = [x for x in v if num(x) is not None]
    return r3(sum(v) / len(v), n) if v else None

# the three groups (29 Oct, evening, Andrew): BOX SCORE what a normal fan reads, FRONT OFFICE what a smart fan cares about, NO LIFE the ball-knower deep end.
# (WAR is not here: it needs fielding, position and league adjustments that no public game log carries for a date in mid-season)
BOX = ["AVG", "HR", "RBI", "R", "H", "OBP", "2B", "3B", "SB", "BB", "SO", "G", "PA", "AB"]
FRONT = ["OPS", "SLG", "ISO", "wOBA", "BABIP", "K %", "BB %", "BARREL %", "HARD-HIT %", "AVG EXIT VELO", "MAX EXIT VELO", "xBA ON CONTACT", "xwOBA ON CONTACT", "AVG BAT SPEED",
         "HR PER FLY BALL", "HR PACE PER 600 PA"]
NOLIFE = ["SQUARED-UP %", "BLAST %", "SWEET-SPOT %", "IDEAL ATTACK ANGLE %", "PULLED AIR %", "LUCK GAP (wOBAcon - xwOBAcon)", "LAUNCH ANGLE SPREAD", "AVG LAUNCH ANGLE",
          "AVG ATTACK ANGLE", "AVG SWING LENGTH", "PULL %", "CENTER %", "OPPO %", "GROUND BALL %", "LINE DRIVE %", "FLY BALL %", "POPUP %", "PITCHES PER PA", "GROUND/AIR", "BB/K",
          "LEFT ON BASE", "GIDP", "HIT BY PITCH", "INTENTIONAL BB", "SAC FLIES", "AB PER HR", "HARDEST-HIT OUT", "AVG DISTANCE", "LONGEST HR", "HR TO THE SWING (WITH TODAY)",
          "DAYS SINCE LAST HR", "HR IN LAST 7 DAYS", "BALLS IN PLAY"]
out, miss = [], 0
for x in balls:
    b, y, day = int(x["b"]), int(x["d"][:4]), x["d"]
    me = where.get(key(x["gm"], x["b"], x["p"], x["in"], x["tb"], x["pn"])) if x.get("gm") and x.get("pn") is not None else None
    if not me:
        miss += 1
    ab = me["at_bat_number"] if me else None
    # the back of the card: every game before the day of the shot
    S = {k: 0 for k in KEYS}
    for d, st in logs.get((b, y), []):
        if d < day:
            for k in KEYS:
                S[k] += int(st.get(k) or 0)
    H, AB, BB, HBP, SF, PA = S["hits"], S["atBats"], S["baseOnBalls"], S["hitByPitch"], S["sacFlies"], S["plateAppearances"]
    obp, slg = rate(H + BB + HBP, AB + BB + HBP + SF), rate(S["totalBases"], AB)
    # the batted balls: everything earlier in the season, this game's earlier at-bats too
    post = me is not None and me["game_type"] in ("F", "D", "L", "W")  # a postseason swing counts the regular season and the postseason so far (no spring or All-Star games)
    prior = [d for d in bbe.get((b, y), []) if d["game_type"] == "R" or (post and d["game_type"] in ("F", "D", "L", "W"))]
    gm = int(float(x["gm"])) if x.get("gm") else None
    s0 = start.get(str(gm), "")
    def earlier(d):
        if d["game_date"] != day:
            return d["game_date"] < day
        if int(d["game_pk"]) == gm:
            return ab is not None and d["at_bat_number"] < ab
        return start.get(str(int(d["game_pk"])), "9") < s0  # the other game of a doubleheader, if it started first
    prior = [d for d in prior if earlier(d)]
    ev = [d["launch_speed"] for d in prior if num(d["launch_speed"]) is not None]
    la = [d["launch_angle"] for d in prior if num(d["launch_angle"]) is not None]
    hrs = [d for d in prior if d["events"] == "home_run"]
    n = len(prior)
    # the deep cuts
    singles = H - S["doubles"] - S["triples"] - S["homeRuns"]
    woba_d = AB + BB - S["intentionalWalks"] + SF + HBP
    woba = rate(0.69 * (BB - S["intentionalWalks"]) + 0.72 * HBP + 0.88 * singles + 1.25 * S["doubles"] + 1.58 * S["triples"] + 2.03 * S["homeRuns"], woba_d)
    spray = []
    for d in prior:
        if num(d["hc_x"]) is None or num(d["hc_y"]) is None:
            continue
        a = math.degrees(math.atan2(d["hc_x"] - 125.42, 198.27 - d["hc_y"]))  # Savant's hit coordinates: + to right field
        a = -a if d["stand"] == "L" else a
        spray.append("pull" if a < -15 else "oppo" if a > 15 else "center")
    bt = [d["bb_type"] for d in prior if d["bb_type"]]
    fly = sum(t == "fly_ball" for t in bt)
    lm = sum(la) / len(la) if la else 0
    sd = r3(math.sqrt(sum((v - lm) ** 2 for v in la) / len(la)), 1) if len(la) > 1 else None
    outs = [d["launch_speed"] for d in prior if d["events"] in ("field_out", "force_out", "grounded_into_double_play", "double_play", "sac_fly", "fielders_choice_out") and num(d["launch_speed"]) is not None]
    hr_days = sorted({d["game_date"] for d in hrs})
    dd = lambda a: (dt.date.fromisoformat(day) - dt.date.fromisoformat(a)).days
    # squared up: the exit velocity over the most that swing could give (1.23 times the bat speed plus 0.23 times the pitch's), 80% or more; a blast: squared-up
    # percent plus bat speed of 164 or more (Statcast's own definitions)
    sw = [d for d in prior if num(d["bat_speed"]) is not None and num(d["launch_speed"]) is not None and num(d["release_speed"]) is not None]
    sq = [d["launch_speed"] / (1.23 * d["bat_speed"] + 0.23 * d["release_speed"]) for d in sw]
    aa = [d["attack_angle"] for d in prior if num(d["attack_angle"]) is not None]
    pulled_air = 0
    for d in prior:
        if num(d["hc_x"]) is None or num(d["hc_y"]) is None or d["bb_type"] not in ("fly_ball", "line_drive"):
            continue
        a2 = math.degrees(math.atan2(d["hc_x"] - 125.42, 198.27 - d["hc_y"]))
        if (-a2 if d["stand"] == "L" else a2) < -15:
            pulled_air += 1
    both = [d for d in prior if num(d["woba_value"]) is not None and num(d["estimated_woba_using_speedangle"]) is not None]  # the same balls on both sides of the luck gap
    wcon, xcon = mean([d["woba_value"] for d in both], 3), mean([d["estimated_woba_using_speedangle"] for d in both], 3)
    A = {"AVG": rate(H, AB), "HR": S["homeRuns"], "RBI": S["rbi"], "R": S["runs"], "H": H, "OBP": obp, "2B": S["doubles"], "3B": S["triples"], "SB": S["stolenBases"], "BB": BB,
         "SO": S["strikeOuts"], "G": S["gamesPlayed"], "PA": PA, "AB": AB,
         "OPS": r3(obp + slg) if obp is not None and slg is not None else None, "SLG": slg, "ISO": r3(slg - rate(H, AB)) if slg is not None and AB else None, "wOBA": woba,
         "BABIP": rate(H - S["homeRuns"], AB - S["strikeOuts"] - S["homeRuns"] + SF), "K %": rate(S["strikeOuts"] * 100, PA, 1), "BB %": rate(BB * 100, PA, 1),
         "BARREL %": rate(sum(d["launch_speed_angle"] == 6 for d in prior) * 100, n, 1), "HARD-HIT %": rate(sum(v >= 95 for v in ev) * 100, len(ev), 1), "AVG EXIT VELO": mean(ev),
         "MAX EXIT VELO": r3(max(ev), 1) if ev else None, "xBA ON CONTACT": mean([d["estimated_ba_using_speedangle"] for d in prior], 3), "xwOBA ON CONTACT": xcon,
         "AVG BAT SPEED": mean([d["bat_speed"] for d in prior]), "HR PER FLY BALL": rate(len(hrs) * 100, fly, 1),  # every home run over the fly balls, the usual way
         "HR PACE PER 600 PA": round(S["homeRuns"] / PA * 600) if PA >= 20 else None,
         "SQUARED-UP %": rate(sum(v >= 0.8 for v in sq) * 100, len(sq), 1), "BLAST %": rate(sum(q * 100 + d["bat_speed"] >= 164 for q, d in zip(sq, sw)) * 100, len(sw), 1),
         "SWEET-SPOT %": rate(sum(8 <= v <= 32 for v in la) * 100, len(la), 1), "IDEAL ATTACK ANGLE %": rate(sum(5 <= v <= 20 for v in aa) * 100, len(aa), 1),
         "PULLED AIR %": rate(pulled_air * 100, n, 1), "LUCK GAP (wOBAcon - xwOBAcon)": r3(wcon - xcon) if wcon is not None and xcon is not None else None, "LAUNCH ANGLE SPREAD": sd,
         "AVG LAUNCH ANGLE": mean(la), "AVG ATTACK ANGLE": mean(aa), "AVG SWING LENGTH": mean([d["swing_length"] for d in prior]),
         "PULL %": rate(spray.count("pull") * 100, len(spray), 1), "CENTER %": rate(spray.count("center") * 100, len(spray), 1), "OPPO %": rate(spray.count("oppo") * 100, len(spray), 1),
         "GROUND BALL %": rate(bt.count("ground_ball") * 100, len(bt), 1), "LINE DRIVE %": rate(bt.count("line_drive") * 100, len(bt), 1), "FLY BALL %": rate(fly * 100, len(bt), 1),
         "POPUP %": rate(bt.count("popup") * 100, len(bt), 1), "PITCHES PER PA": rate(S["numberOfPitches"], PA, 2), "GROUND/AIR": rate(S["groundOuts"], S["airOuts"], 2),
         "BB/K": rate(BB, S["strikeOuts"], 2), "LEFT ON BASE": S["leftOnBase"], "GIDP": S["groundIntoDoublePlay"], "HIT BY PITCH": HBP, "INTENTIONAL BB": S["intentionalWalks"],
         "SAC FLIES": SF, "AB PER HR": rate(AB, S["homeRuns"], 1), "HARDEST-HIT OUT": r3(max(outs), 1) if outs else None, "AVG DISTANCE": mean([d["hit_distance_sc"] for d in prior]),
         "LONGEST HR": max((d["hit_distance_sc"] for d in hrs if num(d["hit_distance_sc"]) is not None), default=None), "HR TO THE SWING (WITH TODAY)": len(hrs),
         "DAYS SINCE LAST HR": dd(hr_days[-1]) if hr_days else None, "HR IN LAST 7 DAYS": sum(0 <= dd(t) < 7 for t in [d["game_date"] for d in hrs]), "BALLS IN PLAY": n}
    thru = max((d for d, _ in logs.get((b, y), []) if d < day), default=None)
    out.append({"thru": thru, "today": sum(1 for d in prior if d["game_date"] == day), "n": [A[k] for k in BOX], "x": [A[k] for k in FRONT], "m": [A[k] for k in NOLIFE]})
json.dump({"cols": {"n": BOX, "x": FRONT, "m": NOLIFE}, "rows": out}, open(ROOT + "apps/web/public/before_stats.json", "w"), separators=(",", ":"))
print("balls", len(balls), "matched to Savant", len(balls) - miss, "unmatched", miss, "| written apps/web/public/before_stats.json")
