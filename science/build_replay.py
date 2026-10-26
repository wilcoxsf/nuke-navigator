"""Real balls for the Replay mode: every Giants home run and near-home-run since bat tracking began (2023-07-14), plus every home run hit at Oracle Park, each with the pitch
(location, spin, speed), the swing (bat speed, attack angle, tilt), the contact (exit speed, launch angle, bearing, projected distance), the weather, and a 'carry' number:
the air-density multiplier that makes the page's physics land the ball at its observed distance (so the replay matches the real ball). Names and jersey numbers come from the
official MLB Stats API people endpoint in a few batched requests (ids only, 2 s apart). Also writes a league pool (compact, no names) for the 'real balls like this' strip.
Outputs (both git-ignored, derived from Statcast): apps/web/public/replay.json and apps/web/public/pool.json. Runs at below-normal priority; a minute or two.
"""
import json
import time

import numpy as np
import pandas as pd
import requests

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import ROOT, fly_path

COLS = ["rid", "game_date", "game_pk", "home_team", "away_team", "inning_topbot", "batter", "pitcher", "stand", "p_throws", "type", "events", "launch_speed", "launch_angle", "bearing",
        "hit_distance_sc", "air_density", "om_temp_f", "om_wind_u", "om_wind_v", "om_pressure_hpa", "plate_x", "plate_z", "sz_top", "sz_bot", "release_speed", "release_spin_rate",
        "spin_axis", "pfx_x", "pfx_z", "pitch_type", "bat_speed", "swing_length", "attack_angle", "attack_direction", "swing_path_tilt", "vaa", "y", "venue_id", "inning", "balls", "strikes", "outs_when_up", "on_1b", "on_2b", "on_3b", "estimated_ba_using_speedangle", "estimated_woba_using_speedangle", "estimated_slg_using_speedangle", "launch_speed_angle", "bb_type", "hit_location", "if_fielding_alignment", "of_fielding_alignment", "delta_run_exp", "delta_home_win_exp", "release_extension", "release_pos_x", "release_pos_z", "arm_angle", "effective_speed", "zone", "description", "pitch_number", "age_bat", "age_pit", "home_score", "away_score", "bat_score", "fld_score", "n_thruorder_pitcher", "om_rh", "om_wind_mph", "om_gust_mph", "om_wind_dir", "plate_speed", "intercept_ball_minus_batter_pos_x_inches", "intercept_ball_minus_batter_pos_y_inches", "attack_direction"]
df = pd.read_parquet(ROOT + "data/derived/exp_features.parquet", columns=COLS)
df = df[(df.game_date >= "2023-07-14") & (df.type == "X") & df.launch_speed.notna() & df.launch_angle.notna() & df.bearing.between(-44.5, 44.5) & df.hit_distance_sc.notna() & df.air_density.notna()].copy()
gi = ((df.home_team == "SF") & (df.inning_topbot == "Bot")) | ((df.away_team == "SF") & (df.inning_topbot == "Top"))
oracle = df.home_team == "SF"
hr = df.events == "home_run"
sel = df[(gi & (hr | (df.hit_distance_sc >= 335))) | (oracle & hr)].copy()
print("Giants batted balls since 2023-07-14:", int(gi.sum()), "| selected:", len(sel), "| Giants HR:", int((gi & hr).sum()), "| Oracle HR:", int((oracle & hr).sum()), flush=True)

# carry: match the observed distance with the page's physics (same bisection as savant_xhr_compare2), then convert to the page's own air density (60% humidity, 1013 hPa)
hand = np.where(sel.stand == "R", 1.0, -1.0)
la, br = sel.launch_angle.to_numpy(float), sel.bearing.to_numpy(float)
base = dict(v0=sel.launch_speed.to_numpy(float) * MPH, theta=np.deg2rad(la), phi=np.deg2rad(br), w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=(-hand * 864 - 75 * br) * RPM)  # side-spin prior refit 22 Oct on wood-bat TrackMan (turn_validation.py); the page's dojo.js uses the same
rho0, target = sel.air_density.to_numpy(float), sel.hit_distance_sc.to_numpy(float)
n = len(sel)
w_side0 = base["w_side"].copy()
dws = np.zeros(n)  # extra side spin (rpm) so the ball comes down at its observed bearing instead of hooking or slicing away on the spin prior
m = np.ones(n)
for rnd in range(2):
    # 1. carry: match the observed distance
    lo, hi = np.full(n, 0.2), np.full(n, 1.8)
    for _ in range(11):
        mid = 0.5 * (lo + hi)
        R, _ = fly_path(rho=rho0 * mid, **{**base, "w_side": w_side0 + dws * RPM})
        too_far = R[:, -1] / FT > target
        lo, hi = np.where(too_far, mid, lo), np.where(too_far, hi, mid)
    m = 0.5 * (lo + hi)
    # 2. side spin: match the observed landing bearing (landing bearing rises or falls with side spin; find which way per ball)
    def land_bearing(d):
        _, _, x, y = fly_path(rho=rho0 * m, return_xy=True, **{**base, "w_side": w_side0 + d * RPM})
        return np.degrees(np.arctan2(x, y))
    b_lo, b_hi = land_bearing(np.full(n, -4000.0)), land_bearing(np.full(n, 4000.0))
    up = b_hi > b_lo
    lo_s, hi_s = np.full(n, -4000.0), np.full(n, 4000.0)
    for _ in range(11):
        mid = 0.5 * (lo_s + hi_s)
        too_right = land_bearing(mid) > br
        go_lower = np.where(up, too_right, ~too_right)  # need less side spin in the "up" direction when the ball lands too far right
        hi_s = np.where(go_lower, mid, hi_s)
        lo_s = np.where(go_lower, lo_s, mid)
    dws = 0.5 * (lo_s + hi_s)
    print("round", rnd + 1, "side-spin offset: median %.0f rpm, 5-95%%: %.0f to %.0f" % (np.median(dws), *np.percentile(dws, [5, 95])), flush=True)
R, _, X, Y = fly_path(rho=rho0 * m, return_xy=True, **{**base, "w_side": w_side0 + dws * RPM})
err = R[:, -1] / FT - target
berr = np.degrees(np.arctan2(X, Y)) - br
print("bearing fit: median |error| %.2f deg, within 1 deg: %.3f" % (np.median(np.abs(berr)), float((np.abs(berr) < 1).mean())), flush=True)
sel["dws"] = dws
print("carry fit: median |error| %.2f ft, within 3 ft: %.3f; multiplier median %.2f (5-95%%: %.2f to %.2f)" % (np.median(np.abs(err)), float((np.abs(err) < 3).mean()), np.median(m), *np.percentile(m, [5, 95])), flush=True)


def page_rho(tF, rh=60.0, hpa=1013.0):
    t = (tF - 32) * 5 / 9
    tk = t + 273.15
    pv = rh / 100 * 6.1078 * 10 ** (7.5 * t / (t + 237.3)) * 100
    return (hpa * 100 - pv) / (287.058 * tk) + pv / (461.495 * tk)


temp = sel.om_temp_f.fillna(62.0).to_numpy(float)
sel["carry"] = m * rho0 / page_rho(temp)
sel["temp"] = temp

# names and numbers from the official people endpoint, batched
ids = sorted(set(sel.batter.astype(int)) | set(sel.pitcher.astype(int)))
H = {"User-Agent": "nuke-navigator-research/0.1 (personal project)"}
players = {}
cache = ROOT + "scratch/players_cache.json"
import os
if os.path.exists(cache):
    players = json.load(open(cache))
ids = [i for i in ids if str(i) not in players]
for i in range(0, len(ids), 100):
    chunk = ids[i:i + 100]
    time.sleep(2)
    r = requests.get("https://statsapi.mlb.com/api/v1/people", params={"personIds": ",".join(map(str, chunk))}, headers=H, timeout=30)
    print("people request", i // 100 + 1, "of", (len(ids) + 99) // 100, r.status_code, flush=True)
    if r.status_code in (401, 403, 429):
        print("blocked: stopping, not working around it")
        raise SystemExit(1)
    for p in r.json().get("people", []):
        players[str(p["id"])] = [p.get("fullName"), p.get("primaryNumber"), (p.get("batSide") or {}).get("code"), (p.get("pitchHand") or {}).get("code")]

try:
    # best honest odds per ball (26 Oct 2026): the final layer (S3 stack + global, venue and in-game carry recalibration) on the test period,
    # the S3 stack on the validation slice, and the out-of-fold wide net (v39c mlp_p) before that
    lay = pd.read_parquet(ROOT + "data/derived/final8/S3_layer.parquet").set_index("rid").p_hr
    s3 = pd.read_parquet(ROOT + "data/derived/final8/S3.parquet").set_index("rid").p_hr
    oof = pd.read_parquet(ROOT + "data/derived/bakeoff_features_v39c.parquet", columns=["rid", "mlp_p"]).set_index("rid").mlp_p
    pm = lay.combine_first(s3).combine_first(oof).rename("phr_model").reset_index()
    sel = sel.merge(pm, on="rid", how="left")
    print("model probability available for", int(sel.phr_model.notna().sum()), "of", len(sel), "balls", flush=True)
except Exception as ex:  # the stack output covers only the validation and test periods
    print("no model probabilities:", ex, flush=True)
    sel["phr_model"] = np.nan
sel["g"] = gi.reindex(sel.index).astype(int) if False else sel.apply(lambda r: int(((r.home_team == "SF") and (r.inning_topbot == "Bot")) or ((r.away_team == "SF") and (r.inning_topbot == "Top"))), axis=1)
json.dump(players, open(cache, 'w'))
balls = []
for r_ in sel.itertuples():
    balls.append({
        "g": int(r_.g),
        "d": r_.game_date[:10] if isinstance(r_.game_date, str) else str(r_.game_date)[:10], "b": int(r_.batter), "p": int(r_.pitcher), "s": r_.stand, "t": r_.p_throws,
        "ev": round(float(r_.launch_speed), 1), "la": round(float(r_.launch_angle), 1), "dir": round(float(r_.bearing), 1), "ft": round(float(r_.hit_distance_sc)),
        "hr": int(r_.events == "home_run"), "ev_": r_.events, "park": "SF" if r_.home_team == "SF" else r_.home_team, "temp": round(float(r_.temp)), "carry": round(float(r_.carry), 3), "dws": round(float(r_.dws)),
        "px": round(float(r_.plate_x), 2), "pz": round(float(r_.plate_z), 2), "st": round(float(r_.sz_top), 2), "sb": round(float(r_.sz_bot), 2),
        "pt": r_.pitch_type, "pv": round(float(r_.release_speed), 1) if r_.release_speed == r_.release_speed else None,
        "rpm": int(r_.release_spin_rate) if r_.release_spin_rate == r_.release_spin_rate else None, "ax": int(r_.spin_axis) if r_.spin_axis == r_.spin_axis else None,
        "hx": round(float(r_.pfx_x) * 12, 1) if r_.pfx_x == r_.pfx_x else None, "hz": round(float(r_.pfx_z) * 12, 1) if r_.pfx_z == r_.pfx_z else None,
        "bs": round(float(r_.bat_speed), 1) if r_.bat_speed == r_.bat_speed else None, "aa": round(float(r_.attack_angle), 1) if r_.attack_angle == r_.attack_angle else None,
        "tilt": round(float(r_.swing_path_tilt), 1) if r_.swing_path_tilt == r_.swing_path_tilt else None, "sl": round(float(r_.swing_length), 2) if r_.swing_length == r_.swing_length else None,
        "vaa": round(float(r_.vaa), 1) if r_.vaa == r_.vaa else None,
    })
def num(x, d=1):
    return None if pd.isna(x) else round(float(x), d)


def txt(x):
    return None if pd.isna(x) else str(x)


def flag(x):
    return int(pd.notna(x))


for rec, r_ in zip(balls, sel.itertuples()):
    rec.update({
        "gm": txt(r_.game_pk), "ht": r_.home_team, "at": r_.away_team, "tb": r_.inning_topbot, "in": num(r_.inning, 0),
        "bl": num(r_.balls, 0), "sk": num(r_.strikes, 0), "ou": num(r_.outs_when_up, 0), "r1": flag(r_.on_1b), "r2": flag(r_.on_2b), "r3": flag(r_.on_3b),
        "bsc": num(r_.bat_score, 0), "fsc": num(r_.fld_score, 0), "xba": num(r_.estimated_ba_using_speedangle, 3), "xw": num(r_.estimated_woba_using_speedangle, 3), "xs": num(r_.estimated_slg_using_speedangle, 3),
        "lsa": num(r_.launch_speed_angle, 0), "bbt": txt(r_.bb_type), "hl": num(r_.hit_location, 0), "ifa": txt(r_.if_fielding_alignment), "ofa": txt(r_.of_fielding_alignment),
        "dre": num(r_.delta_run_exp, 3), "dwe": num(r_.delta_home_win_exp, 3), "ext": num(r_.release_extension, 1), "rx": num(r_.release_pos_x, 2), "rz": num(r_.release_pos_z, 2), "arm": num(r_.arm_angle, 0),
        "eff": num(r_.effective_speed, 1), "zn": num(r_.zone, 0), "ds": txt(r_.description), "pn": num(r_.pitch_number, 0), "agb": num(r_.age_bat, 0), "agp": num(r_.age_pit, 0),
        "tto": num(r_.n_thruorder_pitcher, 0), "rh": num(r_.om_rh, 0), "wm": num(r_.om_wind_mph, 0), "wg": num(r_.om_gust_mph, 0), "wd": num(r_.om_wind_dir, 0), "ps": num(r_.plate_speed, 1),
        "ix": num(r_.intercept_ball_minus_batter_pos_x_inches, 1), "iy": num(r_.intercept_ball_minus_batter_pos_y_inches, 1), "ad": num(r_.attack_direction, 1), "pm": num(r_.phr_model, 4),
        "hpa": num(r_.om_pressure_hpa, 0), "rho": num(r_.air_density, 3),
    })
balls.sort(key=lambda b: (b["d"], b["ev"]), reverse=True)
meta = {"built": "2026-10-22", "rows": len(balls), "from": "2023-07-14", "note": "Giants HR and balls projected 335 ft or more, plus every HR at Oracle Park; carry = air-density multiplier for the page's physics; pfx in inches (induced break, catcher's view); plate_x catcher's view, feet"}
json.dump({"meta": meta, "players": players, "balls": balls}, open(ROOT + "apps/web/public/replay.json", "w"), separators=(",", ":"))

# league pool for 'real balls like this' (compact, no names): hard-hit fair balls since 2023-07-14
pool = df[(df.launch_speed >= 88) & df.launch_angle.between(8, 50)].sample(9000, random_state=5)
arr = [[round(float(a), 1), round(float(b), 1), round(float(c), 1), int(d), int(e == "home_run"), f] for a, b, c, d, e, f in zip(pool.launch_speed, pool.launch_angle, pool.bearing, pool.hit_distance_sc, pool.events, pool.stand)]
json.dump({"cols": ["ev", "la", "dir", "ft", "hr", "stand"], "rows": arr}, open(ROOT + "apps/web/public/pool.json", "w"), separators=(",", ":"))
print("replay balls", len(balls), "players named", len(players), "pool", len(arr), flush=True)
