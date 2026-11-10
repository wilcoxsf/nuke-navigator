"""How good is the other-park view, and can real landings sharpen it? (10 Nov 2026; Andrew: "Look at sharpening the other-park view with real landings ... I want to
know what that would look like in practice and if we could get better there".)

The app's other-park view (the away-wall line in DEJA-VU, the Goner Grid's GONE IN N OF 30 PARKS) flies a real ball with its carry tuned so the physics lands at
its real Statcast distance (hit_distance_sc) along its real bearing (from hc_x, hc_y), then reads its height where it crosses a park's wall, and calls it gone if
that is over the wall. The ground truth: every ball's own park, where we know whether it went out. The test set: 2023-2026 regular-season balls in play whose real
distance came within 40 ft of their own park's wall at their bearing (|bearing| <= 45), at the park the team played in all season (neutral-site games dropped).

  A. DIST     distance alone: gone if the real distance is past the wall line
  B. PHYS     the app's way: the anchored flight's height at the wall against the wall's height (a hard call)
  C. PHYS-P   B's clearance (height over the wall, ft) turned into odds by a logistic fit on the other parks
  D. LEARNED  LightGBM on transportable inputs only (no park identity): distance past the wall, the wall's height there, B's clearance, launch angle, exit speed,
              bearing, the wind along and across the ball's direction, temperature, park elevation and roof
Every model is fit leaving the scored park out (train on 29 parks, score the 30th): exactly the "would it be out somewhere else" situation. Scored on Brier
(the hard calls score their error rate), accuracy, and per park. Writes science/otherpark_study.md and data/derived/otherpark/balls.parquet.
Usage: python science/otherpark_study.py [--years 2023-2026]"""
import argparse
import ctypes
import json
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import fly_path

ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)  # below normal
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
ap = argparse.ArgumentParser(); ap.add_argument("--years", default="2023-2026"); a = ap.parse_args()
y0, y1 = map(int, a.years.split("-"))
ALIAS = {"AZ": "ARI", "OAK": "ATH"}
out = []
say = lambda s="": (out.append(s), print(s, flush=True))

# ---- the balls ----
b = pd.read_parquet(ROOT + "data/derived/bbe_2015_2026_x.parquet", columns=["game_pk", "game_date", "game_year", "home_team", "stand", "launch_speed", "launch_angle",
                                                                          "hit_distance_sc", "hc_x", "hc_y", "is_home_run", "events"])
b = b[(b.game_year >= y0) & (b.game_year <= y1) & b.hit_distance_sc.notna() & b.hc_x.notna() & b.launch_speed.notna() & b.launch_angle.notna()].copy()
b = b[(b.launch_speed >= 80) & b.launch_angle.between(15, 50) & (b.events != "home_run") | (b.events == "home_run")]
b["bearing"] = np.degrees(np.arctan2(b.hc_x - 125.42, 198.27 - b.hc_y))
b = b[b.bearing.abs() <= 45]
b["team"] = b.home_team.map(lambda t: ALIAS.get(t, t))
g = pd.read_parquet(ROOT + "data/raw/game_context/games.parquet", columns=["game_pk", "venue_id", "elevation_ft", "roof"]).drop_duplicates("game_pk")
w = pd.read_parquet(ROOT + "data/raw/game_context/game_weather.parquet", columns=["game_pk", "om_temp_f", "om_rh", "om_pressure_hpa", "om_wind_u", "om_wind_v"]).drop_duplicates("game_pk")
b = b.merge(g, on="game_pk", how="left").merge(w, on="game_pk", how="left")
home_v = b.groupby(["team", "game_year"]).venue_id.agg(lambda s: s.mode().iloc[0]).rename("home_venue")
b = b.join(home_v, on=["team", "game_year"]); b = b[b.venue_id == b.home_venue]  # the team's own park that season
# ---- each park-season's wall at each ball's bearing: that season's five-point fence, or the measured crest when the season matches it ----
F = json.load(open(ROOT + "apps/web/public/fences_by_year.json")); BR = np.array(F["bearings"], float)
crest = {}
for d in Path(ROOT + "apps/web/public/parks").iterdir():
    f = d / "crest.json"
    if f.exists():
        c = json.load(open(f)); crest[d.name] = (np.array(c["bearing"]), np.array(c["radius"]) / FT, np.array(c["height"]) / FT)
p30 = {p["abbr"]: p for p in json.load(open(ROOT + "apps/web/public/parks30.json"))["parks"]}
# (10 Nov, later: oracle_wall_fit.md showed the crest is the best Oracle wall, 2.5% wrong against 7.3% for the old profile this study first used)
oc = json.load(open(ROOT + "apps/web/public/oracle_crest.json")); crest["SF"] = (np.array(oc["bearing"]), np.array(oc["radius"]) / FT, np.array(oc["height"]) / FT)
VEN = {k: v["venue"] for k, v in F["fences"].items()}
def wall_at(team, yr, br):
    f = F["fences"].get(f"{team}:{yr}"); now = F["fences"].get(f"{team}:2026")
    if team in crest and (f is None or f["same_as_crest"] or team == "SF"):
        cb, cr, ch = crest[team]; return np.interp(br, cb, cr), np.interp(br, cb, ch)
    if team in crest and f is not None and now is not None and f["venue"] == now["venue"]:  # the same park, its fence moved: today's crest, shifted by Savant's change between that season and today
        cb, cr, ch = crest[team]
        dd = np.interp(br, BR, np.array(f["dist"]) - np.array(now["dist"])); dh = np.interp(br, BR, np.array(f["height"]) - np.array(now["height"]))
        return np.interp(br, cb, cr) + dd, np.maximum(np.interp(br, cb, ch) + dh, 1.0)
    if f is None and team in p30: f = p30[team]
    if f is None: return np.full(len(br), np.nan), np.full(len(br), np.nan)
    return np.interp(br, BR, f["dist"]), np.interp(br, BR, f["height"])  # a different park that season (the Coliseum, Steinbrenner Field): Savant's five points
wd, wh = np.full(len(b), np.nan), np.full(len(b), np.nan)
for (t, yr), ix in b.groupby(["team", "game_year"]).indices.items():
    d_, h_ = wall_at(t, yr, b.bearing.to_numpy()[ix]); wd[ix], wh[ix] = d_, h_
b["wall_ft"], b["wall_h"] = wd, wh
b = b[b.wall_ft.notna()]
b["margin"] = b.hit_distance_sc - b.wall_ft
b = b[b.margin.abs() <= 40].reset_index(drop=True)
b["y"] = (b.events == "home_run").astype(float)
say(f"# The other-park view: how good, and can real landings sharpen it (seasons {y0}-{y1})")
say(f"- contested balls (real distance within 40 ft of their own wall): {len(b):,} at {b.team.nunique()} parks; home runs {int(b.y.sum()):,} ({b.y.mean():.1%})")

# ---- B: the anchored flight's height at the wall ----
t = (b.om_temp_f.fillna(70) - 32) * 5 / 9; tk = t + 273.15; pv = b.om_rh.fillna(50) / 100 * 6.1078 * 10 ** (7.5 * t / (t + 237.3))
rho0 = ((b.om_pressure_hpa.fillna(1013) - pv) * 100 / (287.058 * tk) + pv * 100 / (461.495 * tk)).to_numpy(float)
la = b.launch_angle.to_numpy(float); hand = np.where(b.stand == "R", 1.0, -1.0); br_ = b.bearing.to_numpy(float)
base = dict(v0=b.launch_speed.to_numpy(float) * MPH, theta=np.deg2rad(la), phi=np.deg2rad(br_), w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=(-hand * 864 - 75 * br_) * RPM)
target, W = b.hit_distance_sc.to_numpy(float), b.wall_ft.to_numpy(float)
clear = np.zeros(len(b)); CH = 6000
for s0 in range(0, len(b), CH):
    sl = slice(s0, s0 + CH); n = len(target[sl]); lo, hi = np.full(n, 0.2), np.full(n, 1.8)
    kw = {k: v[sl] for k, v in base.items()}
    for _ in range(11):  # the density multiplier that makes it land at its real distance (carry_features.py's labels)
        mid = 0.5 * (lo + hi); R, _ = fly_path(rho=rho0[sl] * mid, **kw)
        far = R[:, -1] / FT > target[sl]; lo, hi = np.where(far, mid, lo), np.where(far, hi, mid)
    R, Z = fly_path(rho=rho0[sl] * 0.5 * (lo + hi), **kw)
    Rf, Zf, Ws = R / FT, Z / FT, W[sl]
    hz = np.array([np.interp(Ws[i], Rf[i], Zf[i]) if Rf[i, -1] >= Ws[i] else 0.0 for i in range(n)])  # its height crossing the wall line (0 if it lands short)
    clear[sl] = hz - b.wall_h.to_numpy(float)[sl]
    print(f"  flown {min(s0 + CH, len(b)):,} of {len(b):,}", flush=True)
b["clear"] = clear
# ---- features for C and D ----
dirr = np.deg2rad(br_)
b["wind_out"] = (b.om_wind_u.fillna(0) * np.sin(dirr) + b.om_wind_v.fillna(0) * np.cos(dirr))  # (u, v: toward right field, toward center; along the ball's way out)
b["wind_x"] = (b.om_wind_u.fillna(0) * np.cos(dirr) - b.om_wind_v.fillna(0) * np.sin(dirr))
b["roof_c"] = b.roof.astype(str).map({"Open": 0, "Retractable": 1, "Dome": 2}).fillna(0)
FEATS = ["margin", "wall_h", "clear", "launch_angle", "launch_speed", "bearing", "wind_out", "wind_x", "om_temp_f", "elevation_ft", "roof_c"]
y = b.y.to_numpy(); parks = b.team.to_numpy()
pA = (b.margin > 0).astype(float).to_numpy(); pB = (b.clear > 0).astype(float).to_numpy()
pC, pD = np.zeros(len(b)), np.zeros(len(b))
P = dict(objective="binary", learning_rate=0.05, num_leaves=31, min_data_in_leaf=200, feature_fraction=0.9, bagging_fraction=0.8, bagging_freq=1, verbose=-1, seed=3, num_threads=6)
for pk in sorted(set(parks)):
    te = parks == pk; tr = ~te
    lr = LogisticRegression(C=10).fit(b.loc[tr, ["clear"]], y[tr]); pC[te] = lr.predict_proba(b.loc[te, ["clear"]])[:, 1]
    bst = lgb.train(P, lgb.Dataset(b.loc[tr, FEATS], y[tr]), num_boost_round=400); pD[te] = bst.predict(b.loc[te, FEATS])
b["pA"], b["pB"], b["pC"], b["pD"] = pA, pB, pC, pD
G = pd.factorize(b.game_pk)[0]; nG = G.max() + 1; rng = np.random.default_rng(11); BOOT = [np.bincount(rng.integers(0, nG, nG), minlength=nG) for _ in range(500)]
def ci(v):
    s, c = np.bincount(G, weights=v, minlength=nG), np.bincount(G, minlength=nG)
    return s.sum() / c.sum(), *np.percentile([(s * w_).sum() / (c * w_).sum() for w_ in BOOT], [2.5, 97.5])
say("## Leave-one-park-out, on the contested balls (lower Brier is better; the hard calls' Brier is their error rate)")
names = {"pA": "A. distance alone", "pB": "B. the app's physics (hard call)", "pC": "C. the physics as odds", "pD": "D. learned from real landings"}
for k, nm in names.items():
    e = (b[k].to_numpy() - y) ** 2; m, lo, hi = ci(e); acc = float(((b[k] > 0.5) == (y > 0.5)).mean())
    say(f"- {nm}: Brier {m:.4f} (95% {lo:.4f} to {hi:.4f}); right {acc:.1%}")
for k in ("pA", "pB", "pC"):
    m, lo, hi = ci((pD - y) ** 2 - (b[k].to_numpy() - y) ** 2)
    say(f"- D minus {names[k][:2]}: {m:+.4f} (95% {lo:+.4f} to {hi:+.4f})")
say("## By park (D against B; balls, home-run share, error rate of B, Brier of D), the ten where the app's physics misses most")
pp = b.groupby("team").apply(lambda d: pd.Series({"balls": len(d), "hr": d.y.mean(), "B_err": ((d.pB > 0.5) != (d.y > 0.5)).mean(), "D_brier": ((d.pD - d.y) ** 2).mean(), "B_says_out_but_in": ((d.pB > 0.5) & (d.y < 0.5)).mean(), "B_says_in_but_out": ((d.pB < 0.5) & (d.y > 0.5)).mean()}))
for t_, r in pp.sort_values("B_err", ascending=False).head(10).iterrows():
    say(f"- {t_}: {int(r.balls):,} balls, {r.hr:.0%} out; physics wrong {r.B_err:.1%} (says out but stayed in {r.B_says_out_but_in:.1%}, says in but went out {r.B_says_in_but_out:.1%}); learned Brier {r.D_brier:.4f}")
say(f"- Oracle (SF): " + (lambda r: f"{int(r.balls):,} balls, {r.hr:.0%} out; physics wrong {r.B_err:.1%}; learned Brier {r.D_brier:.4f}")(pp.loc["SF"]) if "SF" in pp.index else "- Oracle: none")
say("## Where the physics goes wrong (B), by its own clearance")
for lo_, hi_ in [(-99, -10), (-10, -3), (-3, 0), (0, 3), (3, 10), (10, 99)]:
    m = (b.clear > lo_) & (b.clear <= hi_)
    if m.sum(): say(f"- clearance {lo_:+} to {hi_:+} ft: {int(m.sum()):,} balls, really out {b.y[m].mean():.0%}; the learned odds average {b.pD[m].mean():.0%}")
# the odds the app uses (wallodds25.js): Oracle's own, and all 30 parks', each a logistic on the clearance
lr_all = LogisticRegression(C=10).fit(b[["clear"]], y); sf = parks == "SF"; lr_sf = LogisticRegression(C=10).fit(b.loc[sf, ["clear"]], y[sf])
odds = {"note": "P(out) = logistic(k x clearance_ft + a): science/otherpark_study.py, 10 Nov 2026", "SF": {"k": float(lr_sf.coef_[0][0]), "a": float(lr_sf.intercept_[0])},
        "all": {"k": float(lr_all.coef_[0][0]), "a": float(lr_all.intercept_[0])}}
json.dump(odds, open(ROOT + "apps/web/public/wall_odds.json", "w"), indent=1)
say(f"- the odds the app uses: Oracle logistic({odds['SF']['k']:.3f} x clearance {odds['SF']['a']:+.3f}); all parks logistic({odds['all']['k']:.3f} x clearance {odds['all']['a']:+.3f}) (apps/web/public/wall_odds.json)")
Path(ROOT + "data/derived/otherpark").mkdir(parents=True, exist_ok=True)
b.to_parquet(ROOT + "data/derived/otherpark/balls.parquet")
Path(ROOT + "science/otherpark_study.md").write_text("\n".join(out) + "\n", encoding="utf-8")
print("written science/otherpark_study.md")
