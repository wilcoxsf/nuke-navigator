"""Open the 2026 postseason lockbox, once (10 Nov 2026; LOCKBOX-PLAN.md v2, after GPT's red team). ANDREW'S CALL ONLY.

Read-only: it loads the frozen predictions (data/prod/lockbox/frozen/pred_frozen.parquet) and the sealed outcomes, scores them, and writes its report to a new
dated folder (data/prod/lockbox/opened/<UTC time>/: report.md, results.json, a copy of the manifest). It never writes or rebuilds a prediction.
Integrity gates first, fail closed (nothing outcome-derived is printed until they pass): the manifest's SHA-256 for the frozen file, the cohort keys, this script
and the plan; 1,931 unique keys from 40 games; exactly one sealed record per scored ball (the sealed file may hold more rows, counted); binary, non-missing
labels; every probability finite and in [0, 1].
Then E1 to E5 of the plan: the home-run count against the frozen prediction-only distribution; Brier with a game-block bootstrap (2,000 resamples, seed 20261110),
paired differences on the SAME resamples (champion minus S3, XGBoost, the logistic, the flat rate); calibration in six bands and the logistic calibration intercept
and slope; the near-wall slice (|margin_hat| < 30 ft); the observed Brier against the model's own expected Brier; log loss (predeclared, secondary).
--dry-run: the same evaluation on FABRICATED labels (drawn from the champion's own probabilities, seed given), never reading the sealed file; --break makes
deliberate faults (dup, missing, nan, allhr, nohr) to check that the gates and the edge cases behave.
Usage: python science/open_lockbox.py --open | --dry-run [--seed 1] [--break dup|missing|nan|allhr|nohr]"""
import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
LB = Path(ROOT + "data/prod/lockbox"); FZ = LB / "frozen"
K = ["game_pk", "at_bat_number", "pitch_number"]
COMP = [("p_s3", "the S3 stack"), ("p_xgb", "XGBoost, three seeds"), ("p_logit", "the contact-only logistic"), ("p_flat", "the flat training rate")]
BANDS = [0, 0.01, 0.05, 0.2, 0.5, 0.8, 1.0]
ap = argparse.ArgumentParser()
g = ap.add_mutually_exclusive_group(required=True)
g.add_argument("--open", action="store_true"); g.add_argument("--dry-run", action="store_true")
ap.add_argument("--seed", type=int, default=1); ap.add_argument("--break", dest="brk", default="")
a = ap.parse_args()
out = []
say = lambda s="": (out.append(s), print(s))
def stop(msg):
    print("INTEGRITY FAIL: " + msg); sys.exit(2)

# ---- integrity, before any outcome ----
man = json.load(open(FZ / "manifest.json"))
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
for name, path in (("pred_frozen.parquet", FZ / "pred_frozen.parquet"), ("cohort_keys.parquet", FZ / "cohort_keys.parquet"), ("open_lockbox.py", __file__), ("plan", man["plan_path"])):
    if sha(path) != man["sha256"][name]:
        stop(f"{name} does not match its frozen SHA-256")
fz = pd.read_parquet(FZ / "pred_frozen.parquet")
cols = ["p_blend"] + [c for c, _ in COMP]
if a.brk == "dup": fz = pd.concat([fz, fz.iloc[:1]], ignore_index=True)
if a.brk == "missing": fz = fz.iloc[1:].copy()
if a.brk == "nan": fz.loc[fz.index[0], "p_blend"] = np.nan
if len(fz) != man["n"] or fz.duplicated(K).any(): stop(f"{len(fz)} rows, {int(fz.duplicated(K).sum())} duplicated keys; the frozen cohort is {man['n']}")
if fz.game_pk.nunique() != man["games"]: stop(f"{fz.game_pk.nunique()} games; frozen {man['games']}")
P = fz[cols].to_numpy(float)
if not (np.isfinite(P).all() and (P >= 0).all() and (P <= 1).all()): stop("a probability is missing, infinite or outside [0, 1]")
if a.open:
    sealed = pd.read_parquet(LB / "sealed.parquet", columns=K + ["is_home_run"])
    for c in K: sealed[c] = sealed[c].astype("int64")
    if sealed.duplicated(K).any(): stop("duplicated keys in the sealed file")
    d = fz.merge(sealed, on=K, how="left", validate="one_to_one", indicator=True)
    if (d._merge != "both").any(): stop(f"{int((d._merge != 'both').sum())} scored balls have no sealed record")
    extra = len(sealed) - len(fz)
    if d.is_home_run.isna().any(): stop("a sealed label is missing")
    y = d.is_home_run.astype(bool).astype(float).to_numpy()
    mode = "OPENED: THE REAL POSTSEASON OUTCOMES"
else:
    d = fz.copy(); extra = 0
    r = np.random.default_rng(a.seed); y = (r.random(len(d)) < d.p_blend.to_numpy()).astype(float)
    if a.brk == "allhr": y[:] = 1
    if a.brk == "nohr": y[:] = 0
    mode = f"DRY RUN on fabricated labels (seed {a.seed}{', break ' + a.brk if a.brk else ''}); NOT the real outcomes"
assert len(y) == len(d) and set(np.unique(y)) <= {0.0, 1.0}

# ---- the evaluation ----
G = pd.factorize(d.game_pk)[0]; nG = G.max() + 1
rng = np.random.default_rng(20261110); BOOT = [np.bincount(rng.integers(0, nG, nG), minlength=nG) for _ in range(2000)]  # the same game resamples for everything
def boot(v, mask=None):
    w0 = np.ones(len(v)) if mask is None else mask.astype(float)
    s, c = np.bincount(G, weights=v * w0, minlength=nG), np.bincount(G, weights=w0, minlength=nG)
    est = s.sum() / max(c.sum(), 1e-12); bs = [(s * b).sum() / max((c * b).sum(), 1e-12) for b in BOOT]
    return est, *np.percentile(bs, [2.5, 97.5])
pb = d.p_blend.to_numpy(); e = (pb - y) ** 2
say(f"# The 2026 postseason lockbox: {mode}")
say(f"- {datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}; frozen {man['frozen_utc']}; commit {man['git_commit'][:10]}; scored balls {len(d):,} from {nG} games; sealed records outside the cohort {extra:,}")
say("## E1. Home runs: predicted against actual")
lo, hi = man.get("pred_only", {}).get("hr_95", [None, None])
tail = man.get("pred_only", {}).get("hr_tail")
ah = int(y.sum())
ptail = None
if tail is not None:
    sims = np.array(tail); ptail = float(min(1.0, 2 * min((sims <= ah).mean(), (sims >= ah).mean())))
say(f"- actual {ah} against {pb.sum():.1f} predicted ({ah - pb.sum():+.1f}); empirical rate {y.mean():.4f}; the frozen prediction-only 95% range {lo} to {hi}; two-sided predictive tail probability {ptail if ptail is None else round(ptail, 3)}")
say("- (that range assumes every ball independent and the model exactly calibrated; shared game conditions can make it too narrow; inside it is not proof of fitness, outside it is not proof of a bug)")
say("## E2. Brier, with paired differences on the same game resamples")
res = {"n": len(d), "games": int(nG), "actual_hr": ah, "predicted_hr": float(pb.sum()), "ptail": ptail}
b0 = boot(e); say(f"- the champion: {b0[0]:.5f} (95% {b0[1]:.5f} to {b0[2]:.5f})"); res["brier"] = b0
for c, nm in COMP:
    pc = d[c].to_numpy(); bc = boot((pc - y) ** 2); df = boot(e - (pc - y) ** 2)
    say(f"- {nm}: {bc[0]:.5f} (95% {bc[1]:.5f} to {bc[2]:.5f}); champion minus it {df[0]:+.5f} (95% {df[1]:+.5f} to {df[2]:+.5f}){'  [inconclusive: the interval crosses zero]' if df[1] < 0 < df[2] else ''}")
    res[c] = {"brier": bc, "diff": df}
say("## E3. Calibration")
bins = pd.cut(d.p_blend, BANDS, include_lowest=True)
tb = pd.DataFrame({"band": bins, "p": pb, "y": y}).groupby("band", observed=False).agg(balls=("y", "size"), predicted=("p", "sum"), actual=("y", "sum"), mean_p=("p", "mean"))
say("| band | balls | predicted HR | actual HR | mean predicted |"); say("|---|---|---|---|---|")
for k, r in tb.iterrows(): say(f"| {k} | {int(r.balls)} | {r.predicted:.1f} | {int(r.actual)} | {r.mean_p:.4f} |" if r.balls else f"| {k} | 0 | - | - | - |")
lg = np.log(np.clip(pb, 1e-6, 1 - 1e-6) / (1 - np.clip(pb, 1e-6, 1 - 1e-6)))
if 0 < y.sum() < len(y):
    from scipy.optimize import minimize
    nll = lambda w: (np.logaddexp(0, w[0] + w[1] * lg) - y * (w[0] + w[1] * lg)).sum()
    w = minimize(nll, np.array([0.0, 1.0]), method="L-BFGS-B").x
    ws = []
    for b in BOOT[:400]:
        ww = b[G].astype(float); f = lambda q: (ww * (np.logaddexp(0, q[0] + q[1] * lg) - y * (q[0] + q[1] * lg))).sum()
        ws.append(minimize(f, w, method="L-BFGS-B").x)
    ws = np.array(ws)
    say(f"- calibration intercept {w[0]:+.3f} (95% {np.percentile(ws[:, 0], 2.5):+.3f} to {np.percentile(ws[:, 0], 97.5):+.3f}), slope {w[1]:.3f} (95% {np.percentile(ws[:, 1], 2.5):.3f} to {np.percentile(ws[:, 1], 97.5):.3f}); 0 and 1 are perfect; for information only, nothing is changed from it")
    res["calibration"] = {"intercept": float(w[0]), "slope": float(w[1])}
else:
    say("- calibration intercept and slope: not estimable (no home runs, or every ball a home run)")
say("## E4. Near the wall (|margin_hat| < 30 ft) and Oracle")
nw = (d.margin_hat.abs() < 30).to_numpy()
if nw.sum():
    bn = boot(e, nw); dn = boot(e - (d.p_s3.to_numpy() - y) ** 2, nw)
    say(f"- {int(nw.sum())} balls: champion Brier {bn[0]:.5f} (95% {bn[1]:.5f} to {bn[2]:.5f}); minus the S3 stack {dn[0]:+.5f} (95% {dn[1]:+.5f} to {dn[2]:+.5f}); predicted {pb[nw].sum():.1f} home runs, actual {int(y[nw].sum())}")
else:
    say("- no ball near the wall")
say(f"- Oracle Park: not estimable (no postseason game was played there; {int((d.venue_id == 2395).sum())} balls)")
say("## E5. The score against the model's own expectation")
exp_b = float((pb * (1 - pb)).mean())
say(f"- observed Brier {b0[0]:.5f} against the model's expected {exp_b:.5f} (mean p(1-p)); the frozen prediction-only 95% range {man.get('pred_only', {}).get('brier_95')}")
ll = -(y * np.log(np.clip(pb, 1e-6, 1)) + (1 - y) * np.log(np.clip(1 - pb, 1e-6, 1))).mean()
say(f"- log loss (secondary, predeclared): {ll:.4f}")
stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
od = LB / ("opened" if a.open else "dryrun") / stamp; od.mkdir(parents=True, exist_ok=True)
(od / "report.md").write_text("\n".join(out) + "\n", encoding="utf-8")
json.dump(res, open(od / "results.json", "w"), indent=1, default=float)
json.dump(man, open(od / "manifest.json", "w"), indent=1)
print("written:", od)
