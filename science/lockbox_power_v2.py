"""What the lockbox can decide, from the FROZEN PREDICTIONS ONLY (10 Nov 2026; GPT red team finding 6). No outcome is read.
- Fixed-cohort predictive distributions: y_i ~ Bernoulli(p_blend_i), the cohort held fixed (no game resampling): the total home runs, the champion's Brier, and the
  paired Brier difference against each comparator.
- Power: for synthetic outcome vectors, the game-block bootstrap the opener uses (same rule for every comparator), and the share of runs whose 95% interval for
  champion minus the logistic, and minus the flat rate, lies wholly below zero.
- Sensitivity: the same, when the truth is NOT the champion: a calibration intercept of -0.25 or +0.25 logit, a slope of 0.8 or 1.2, or a shared game effect
  (sd 0.3 logit); how often the home-run count then falls outside the frozen 95% range.
Writes pred_only into data/prod/lockbox/frozen/manifest.json (the opener reads it) and power_report.md beside it. Usage: python science/lockbox_power_v2.py"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

FZ = Path("C:/Users/andrewwi/dev/nuke-navigator-new/data/prod/lockbox/frozen")
fz = pd.read_parquet(FZ / "pred_frozen.parquet")
pb = fz.p_blend.to_numpy(); comps = {c: fz[c].to_numpy() for c in ["p_s3", "p_xgb", "p_savant_x", "p_savant_lsa", "p_logit", "p_flat"]}
G = pd.factorize(fz.game_pk)[0]; nG = G.max() + 1
rng = np.random.default_rng(7)
lgt = lambda p: np.log(np.clip(p, 1e-6, 1 - 1e-6) / (1 - np.clip(p, 1e-6, 1 - 1e-6))); sig = lambda z: 1 / (1 + np.exp(-z))
out = []
say = lambda s="": (out.append(s), print(s))
# fixed-cohort distributions
S = 10000
Y = rng.random((S, len(pb))) < pb
hr = Y.sum(1); br = ((pb - Y) ** 2).mean(1)
q = lambda v: [round(float(x), 5) for x in np.percentile(v, [2.5, 97.5])]
say("# Lockbox power, from the frozen predictions only")
say(f"- {len(pb):,} balls, {nG} games, {pb.sum():.1f} expected home runs")
say(f"- if the champion is exactly right (fixed cohort, {S:,} draws): home runs 95% {int(np.percentile(hr, 2.5))} to {int(np.percentile(hr, 97.5))}; champion Brier 95% {q(br)}; its expectation {float((pb * (1 - pb)).mean()):.5f}")
for c, p in comps.items():
    dd = ((pb - Y) ** 2 - (p - Y) ** 2).mean(1)
    say(f"- champion minus {c}: 95% {q(dd)}, mean {dd.mean():+.5f}")
# power with the opener's game-block bootstrap (fewer runs: each needs its own bootstrap)
B = [np.bincount(rng.integers(0, nG, nG), minlength=nG) for _ in range(500)]
def power(truth, runs=300):
    win = {"p_savant_x": 0, "p_logit": 0, "p_flat": 0}; outside = 0
    for _ in range(runs):
        y = (rng.random(len(pb)) < truth()).astype(float)
        if not (lo <= y.sum() <= hi): outside += 1
        for c in win:
            v = (pb - y) ** 2 - (comps[c] - y) ** 2; s = np.bincount(G, weights=v, minlength=nG); n = np.bincount(G, minlength=nG)
            if np.percentile([(s * b).sum() / (n * b).sum() for b in B], 97.5) < 0: win[c] += 1
    return {c: round(w / runs, 3) for c, w in win.items()}, round(outside / runs, 3)
lo, hi = int(np.percentile(hr, 2.5)), int(np.percentile(hr, 97.5))
say("## Power and sensitivity (300 synthetic postseasons each; the opener's 2,000-resample bootstrap approximated with 500)")
rows = [("the champion is right", lambda: pb), ("calibration intercept -0.25 logit", lambda: sig(lgt(pb) - 0.25)), ("intercept +0.25", lambda: sig(lgt(pb) + 0.25)),
        ("slope 0.8", lambda: sig(0.8 * lgt(pb) - 0.5)), ("slope 1.2", lambda: sig(1.2 * lgt(pb) + 0.5)), ("a shared game effect, sd 0.3 logit", lambda: sig(lgt(pb) + rng.normal(0, 0.3, nG)[G]))]
for name, f in rows:
    pw, oc = power(f)
    say(f"- {name}: truth's expected home runs {np.mean([f().sum() for _ in range(20)]):.1f}; the count falls outside {lo}-{hi} in {oc:.0%} of runs; the champion clearly beats Savant's expected stats in {pw['p_savant_x']:.0%}, the logistic in {pw['p_logit']:.0%}, the flat rate in {pw['p_flat']:.0%}")
say("(slope 0.8 and 1.2 carry a matching intercept so the rate stays near the champion's; these are model-conditional estimates, not guarantees of real-world power)")
man = json.load(open(FZ / "manifest.json"))
man["pred_only"] = {"hr_95": [lo, hi], "brier_95": q(br), "expected_brier": float((pb * (1 - pb)).mean()), "hr_tail": hr[:5000].tolist()}
json.dump(man, open(FZ / "manifest.json", "w"), indent=1)
(FZ / "power_report.md").write_text("\n".join(out) + "\n", encoding="utf-8")
print("pred_only written into", FZ / "manifest.json")
