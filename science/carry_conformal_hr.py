"""Experiment E3 (GPT round-3 ideas A and C; my idea A): carry as the unified latent, with calibrated uncertainty, used to predict real home runs.
From ONLY what a what-if user sets (exit speed, launch angle, landing bearing, hand, temperature) plus the source park's fence, a nine-quantile LightGBM model gives a distribution of log carry;
it is widened by split-conformal calibration; then 24 common draws per ball are flown through the ball's own air and compared with the source park's wall. Scored on held-out games:
  coverage of the 80% carry interval (overall and in consequential cohorts), its width in feet (via the local sensitivity J), and the home-run probability from the draws (Brier, log loss,
  reliability) against (a) the deterministic prior (carry 1) and (b) a LightGBM classifier on the SAME inputs. Acceptance rule from GPT: coverage near 80% with no glaring cohort undercoverage, and
  the physics-structured home-run probability within noise of (or better than) the plain classifier on the same inputs.
Needs data/derived/carry_dataset.parquet (carry_dataset.py). Runs at below-normal priority, about 10 minutes. Output: science/carry_conformal_hr.md."""
import json

import lightgbm as lgb
import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import ROOT, clears, fly_path

out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


df = pd.read_parquet(ROOT + "data/derived/carry_dataset.parquet")
parks = json.load(open(ROOT + "apps/web/public/parks30.json"))
B = np.array(parks["bearings"])
alias = {"AZ": "ARI", "OAK": "ATH", "CWS": "CHW", "WSN": "WSH"}
byab = {p["abbr"]: p for p in parks["parks"]}
fence = np.full(len(df), np.nan)
wall = np.full(len(df), np.nan)
for ab, g in df.groupby("home_team"):
    p = byab.get(ab) or byab.get(alias.get(ab, ab))
    if p is None:
        continue
    ix = g.index.to_numpy()
    fence[ix] = np.interp(df.loc[ix, "bearing"], B, p["dist"])
    wall[ix] = np.interp(df.loc[ix, "bearing"], B, p["height"])
df["fence"], df["wall"] = fence, wall
df = df[df.fence.notna()].reset_index(drop=True)
say("# Carry distribution and home-run prediction (22 Oct 2026), %d balls with a known source-park fence" % len(df))
gid = df.game_pk.astype(int) % 4
tr, ca, te = df[gid < 2].reset_index(drop=True), df[gid == 2].reset_index(drop=True), df[gid == 3].reset_index(drop=True)
say("split by game: train %d, calibration %d, test %d" % (len(tr), len(ca), len(te)))
WHATIF = ["launch_speed", "launch_angle", "bearing", "stand_r", "om_temp_f"]
FEN = WHATIF + ["fence", "wall"]
Q = np.array([0.01, 0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99])
P = dict(n_estimators=250, learning_rate=0.05, num_leaves=15, min_child_samples=80, subsample=0.8, subsample_freq=1, colsample_bytree=0.9, verbose=-1, n_jobs=3)


def quant(train, feats):
    return [lgb.LGBMRegressor(objective="quantile", alpha=float(q), **P).fit(train[feats], train.logm) for q in Q]


def predq(models, frame, feats):
    z = np.column_stack([m.predict(frame[feats]) for m in models])
    return np.maximum.accumulate(z, axis=1)


models = quant(tr, WHATIF)
qc, qt = predq(models, ca, WHATIF), predq(models, te, WHATIF)
i10, i90 = 2, 6
score = np.maximum(qc[:, i10] - ca.logm.to_numpy(), ca.logm.to_numpy() - qc[:, i90])
n = len(score)
adj = np.quantile(score, min(1.0, np.ceil((n + 1) * 0.8) / n), method="higher")
lo, hi = qt[:, i10] - adj, qt[:, i90] + adj
y = te.logm.to_numpy()
say("\n## 80% interval for log carry (test games)")
say("conformal adjustment %+.4f in log carry" % adj)
def cov(mask, label):
    m = mask.to_numpy() if hasattr(mask, "to_numpy") else mask
    if m.sum() < 80:
        return
    raw = np.mean((y[m] >= qt[m, i10]) & (y[m] <= qt[m, i90]))
    cal = np.mean((y[m] >= lo[m]) & (y[m] <= hi[m]))
    wid = np.median((hi - lo)[m] * te.J.to_numpy()[m])
    say("  %-46s n %5d  raw coverage %.3f  conformal %.3f  median width %.0f ft" % (label, m.sum(), raw, cal, wid))
cov(np.ones(len(te), bool), "all test balls")
cov((te.launch_speed.between(100, 110)) & te.launch_angle.between(20, 35), "100 to 110 mph, 20 to 35 degrees")
cov((te.launch_speed >= 105), "105 mph and up")
cov(te.launch_angle.between(20, 26), "launch angle 20 to 26 degrees")
cov(te.bearing.abs() > 35, "bearing beyond 35 degrees (near the lines)")
cov((te.fence - te.sim0).abs() < 20, "simulated distance within 20 ft of the fence")
cov(te.stand_r == 1, "right-handed batters")
cov(te.stand_r == 0, "left-handed batters")

# common draws through each ball's own air and its source park
sel = np.where(((te.sim0 - te.fence).abs() < 60) & te.launch_angle.between(15, 50) & (te.launch_speed >= 88))[0]
rng = np.random.default_rng(1)
sel = rng.choice(sel, min(2500, len(sel)), replace=False)
sub = te.iloc[sel].reset_index(drop=True)
hand = np.where(sub.stand_r == 1, 1.0, -1.0)
lasub, brsub = sub.launch_angle.to_numpy(float), sub.bearing.to_numpy(float)
base = dict(v0=sub.launch_speed.to_numpy(float) * MPH, theta=np.deg2rad(lasub), phi=np.deg2rad(brsub), w_back=np.maximum(0, -763 + 120 * lasub) * RPM, w_side=(-hand * 864 - 75 * brsub) * RPM)
rho0 = sub.air_density.to_numpy(float)
fcm, wlm = sub.fence.to_numpy(float) * FT, sub.wall.to_numpy(float) * FT
ND = 24
qs = np.column_stack([qt[sel, i] for i in range(len(Q))])
# variant E3b: widen each quantile by the conformal adjustment and extend the tails to the 0.1st and 99.9th percentile with normal-shaped extrapolation
from scipy.stats import norm
QX = np.concatenate([[0.001], Q, [0.999]])
zq = norm.ppf(Q)
lo_slope = (qs[:, 1] - qs[:, 0]) / (zq[1] - zq[0])
hi_slope = (qs[:, -1] - qs[:, -2]) / (zq[-1] - zq[-2])
qw = qs + np.where(Q < 0.5, -adj, adj)[None, :]
qsx = np.column_stack([qw[:, 0] + lo_slope * (norm.ppf(0.001) - zq[0]), qw, qw[:, -1] + hi_slope * (norm.ppf(0.999) - zq[-1])])
u = rng.uniform(0.001, 0.999, (len(sub), ND))


def run_draws(nodes, qvals, label):
    dr = np.array([np.interp(np.clip(u[i], nodes[0], nodes[-1]), nodes, qvals[i]) for i in range(len(sub))])
    p = np.zeros(len(sub))
    for d in range(ND):
        mult = np.exp(dr[:, d])
        for s0 in range(0, len(sub), 4000):
            sl = slice(s0, s0 + 4000)
            R, Z = fly_path(rho=rho0[sl] * mult[sl], **{k: v[sl] for k, v in base.items()})
            p[sl] += clears(R, Z, fcm[sl], wlm[sl])
        print("  %s draw %d" % (label, d + 1), flush=True)
    return p / ND


phr = run_draws(Q, qs, "raw")
phr2 = run_draws(QX, qsx, "widened")
ya = sub.y.to_numpy().astype(float)
# deterministic prior: carry 1
det = np.zeros(len(sub))
for s0 in range(0, len(sub), 4000):
    sl = slice(s0, s0 + 4000)
    R, Z = fly_path(rho=rho0[sl], **{k: v[sl] for k, v in base.items()})
    det[sl] = clears(R, Z, fcm[sl], wlm[sl])
# plain classifier on the same inputs
clf = lgb.LGBMClassifier(n_estimators=300, learning_rate=0.04, num_leaves=15, min_child_samples=60, subsample=0.8, subsample_freq=1, verbose=-1, n_jobs=3).fit(tr[FEN], tr.y)
pc = clf.predict_proba(sub[FEN])[:, 1]


def brier(p): return float(np.mean((p - ya) ** 2))
def ll(p): p = np.clip(p, 1e-4, 1 - 1e-4); return float(-np.mean(ya * np.log(p) + (1 - ya) * np.log(1 - p)))
say("\n## Home-run probability for %d test fly balls within 60 ft of their own fence (home-run share %.3f)" % (len(sub), ya.mean()))
say("  %-52s Brier %.4f   log loss %.4f" % ("deterministic physics prior (carry 1, 0 or 1)", brier(det), ll(det)))
say("  %-52s Brier %.4f   log loss %.4f" % ("carry distribution, 24 common draws (what-if inputs)", brier(phr), ll(phr)))
say("  %-52s Brier %.4f   log loss %.4f" % ("E3b draws: conformal-widened, tails to 0.1% and 99.9%", brier(phr2), ll(phr2)))
say("  %-52s Brier %.4f   log loss %.4f" % ("plain LightGBM classifier on the same inputs + fence", brier(pc), ll(pc)))
say("  %-52s Brier %.4f" % ("average of the draws and the classifier", brier(0.5 * (phr + pc))))
say("  %-52s Brier %.4f" % ("average of the E3b draws and the classifier", brier(0.5 * (phr2 + pc))))
for nm, pp in (("raw draws", phr), ("E3b draws", phr2)):
    say("  reliability of the %s (predicted bin -> actual home-run share):" % nm)
    for lo_b, hi_b in ((0, 0.1), (0.1, 0.3), (0.3, 0.5), (0.5, 0.7), (0.7, 0.9), (0.9, 1.01)):
        m = (pp >= lo_b) & (pp < hi_b)
        if m.sum() > 20:
            say("    %.1f to %.1f: n %4d  predicted %.3f  actual %.3f   (classifier %.3f)" % (lo_b, hi_b, m.sum(), pp[m].mean(), ya[m].mean(), pc[m].mean()))
say("\nreading: coverage near 80% in every cohort and a draws-based Brier within noise of the classifier on the same inputs would mean the carry-distribution interface is as good as a plain model while giving a physical band for every park.")
open(ROOT + "science/carry_conformal_hr.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
