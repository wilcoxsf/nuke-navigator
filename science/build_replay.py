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
        "spin_axis", "pfx_x", "pfx_z", "pitch_type", "bat_speed", "swing_length", "attack_angle", "attack_direction", "swing_path_tilt", "vaa", "y", "venue_id"]
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
base = dict(v0=sel.launch_speed.to_numpy(float) * MPH, theta=np.deg2rad(la), phi=np.deg2rad(br), w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=(-hand * 849 - 94 * br) * RPM)
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

sel["g"] = gi.reindex(sel.index).astype(int)
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
balls.sort(key=lambda b: (b["d"], b["ev"]), reverse=True)
meta = {"built": "2026-10-22", "rows": len(balls), "from": "2023-07-14", "note": "Giants HR and balls projected 335 ft or more, plus every HR at Oracle Park; carry = air-density multiplier for the page's physics; pfx in inches (induced break, catcher's view); plate_x catcher's view, feet"}
json.dump({"meta": meta, "players": players, "balls": balls}, open(ROOT + "apps/web/public/replay.json", "w"), separators=(",", ":"))

# league pool for 'real balls like this' (compact, no names): hard-hit fair balls since 2023-07-14
pool = df[(df.launch_speed >= 88) & df.launch_angle.between(8, 50)].sample(9000, random_state=5)
arr = [[round(float(a), 1), round(float(b), 1), round(float(c), 1), int(d), int(e == "home_run"), f] for a, b, c, d, e, f in zip(pool.launch_speed, pool.launch_angle, pool.bearing, pool.hit_distance_sc, pool.events, pool.stand)]
json.dump({"cols": ["ev", "la", "dir", "ft", "hr", "stand"], "rows": arr}, open(ROOT + "apps/web/public/pool.json", "w"), separators=(",", ":"))
print("replay balls", len(balls), "players named", len(players), "pool", len(arr), flush=True)
