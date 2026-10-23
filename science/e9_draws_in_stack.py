"""Experiment E9: does the physics carry-draw home-run probability add to the production model stack?
E3c showed that averaging carry-draw probabilities with a plain classifier on the five what-if inputs beats the classifier (Brier 0.0670 vs 0.0701). The production models have far richer inputs, so the real question is
whether a physics probability still adds anything. Method:
  1. nine-quantile LightGBM of log carry on carry_dataset rows before the validation period (75% fit, last 25% by date for the conformal adjustment), inputs exit speed, launch angle, bearing, hand, temperature;
  2. for every validation and test ball that could plausibly clear a fence (launch angle 15 to 50, exit speed 85+, |bearing| under 50), fly 24 common draws through the ball's own air density and the home park's fence and wall height
     (parks30.json) at (A) the model's own estimated bearing (predict mode) and (B) the true bearing (reconstruct mode); balls outside that box get probability 0;
  3. logistic stack on the validation period over the logits of the existing models (XGBoost v5r, physics net v3b, LightGBM, CatBoost, MLP) with and without the draws probability, scored on the test period with a paired game bootstrap
     (near-wall and Oracle Park as well). Differences under about 0.0002 Brier are noise.
Output: science/e9_draws_in_stack.md. Heavy (about 20 minutes); lowers its own priority."""
import json
import os

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import ROOT, clears, fly_path

try:
    import psutil
    psutil.Process(os.getpid()).nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
except Exception:
    pass
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


T0 = "2025-03-18"
cd = pd.read_parquet(ROOT + "data/derived/carry_dataset.parquet")
cd["game_date"] = cd.game_date.astype(str)
pre = cd[cd.game_date < T0].sort_values("game_date").reset_index(drop=True)
cut = int(len(pre) * 0.75)
fit, cal = pre.iloc[:cut], pre.iloc[cut:]
WHATIF = ["launch_speed", "launch_angle", "bearing", "stand_r", "om_temp_f"]
Q = np.array([0.01, 0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99])
P = dict(n_estimators=250, learning_rate=0.05, num_leaves=15, min_child_samples=80, subsample=0.8, subsample_freq=1, colsample_bytree=0.9, verbose=-1, n_jobs=3)
models = [lgb.LGBMRegressor(objective="quantile", alpha=float(q), **P).fit(fit[WHATIF], fit.logm) for q in Q]


def predq(frame):
    return np.maximum.accumulate(np.column_stack([m.predict(frame[WHATIF]) for m in models]), axis=1)


qc = predq(cal)
score = np.maximum(qc[:, 2] - cal.logm.to_numpy(), cal.logm.to_numpy() - qc[:, 6])
adj = float(np.quantile(score, min(1.0, np.ceil((len(score) + 1) * 0.8) / len(score)), method="higher"))
say("# Physics carry draws inside the production stack (22 Oct 2026)")
say("quantile model fitted on %d balls before %s, conformal adjustment %+.4f from %d later balls" % (len(fit), T0, adj, len(cal)))

cols = ["rid", "split", "y", "game_pk", "game_date", "home_team", "launch_speed", "launch_angle", "bearing", "bearing_hat", "stand_r", "om_temp_f", "air_density", "margin_hat"]
df = pd.read_parquet(ROOT + "data/derived/bakeoff_features_v5r.parquet", columns=cols)
df = df[df.split.isin(["val", "test"])].reset_index(drop=True)
parks = json.load(open(ROOT + "apps/web/public/parks30.json"))
B = np.array(parks["bearings"])
alias = {"AZ": "ARI", "OAK": "ATH", "CWS": "CHW", "WSN": "WSH"}
byab = {p["abbr"]: p for p in parks["parks"]}
fence_t = np.full(len(df), np.nan)
wall_t = np.full(len(df), np.nan)
fence_h = np.full(len(df), np.nan)
wall_h = np.full(len(df), np.nan)
for ab, g in df.groupby("home_team"):
    p = byab.get(ab) or byab.get(alias.get(ab, ab))
    if p is None:
        continue
    ix = g.index.to_numpy()
    fence_t[ix] = np.interp(df.loc[ix, "bearing"], B, p["dist"])
    wall_t[ix] = np.interp(df.loc[ix, "bearing"], B, p["height"])
    fence_h[ix] = np.interp(df.loc[ix, "bearing_hat"], B, p["dist"])
    wall_h[ix] = np.interp(df.loc[ix, "bearing_hat"], B, p["height"])
df["air_density"] = df.air_density.fillna(1.2)
df["om_temp_f"] = df.om_temp_f.fillna(df.om_temp_f.median())
df["stand_r"] = df.stand_r.astype(float)
elig_common = (df.launch_angle.between(15, 50) & (df.launch_speed >= 85)).to_numpy()
say("validation + test balls %d, eligible by launch box %d, with a known park %d" % (len(df), elig_common.sum(), (elig_common & ~np.isnan(fence_t)).sum()))
rng = np.random.default_rng(7)
ND = 24
norm_ppf = __import__("scipy.stats", fromlist=["norm"]).norm.ppf
zq = norm_ppf(Q)
QX = np.concatenate([[0.001], Q, [0.999]])


def draws_prob(bearing, fence, wall, label):
    ok = elig_common & (np.abs(bearing) < 50) & ~np.isnan(fence) & ~np.isnan(bearing)
    ix = np.where(ok)[0]
    sub = df.iloc[ix].copy()
    sub["bearing"] = bearing[ix]
    qs = predq(sub)
    lo_s = (qs[:, 1] - qs[:, 0]) / (zq[1] - zq[0])
    hi_s = (qs[:, -1] - qs[:, -2]) / (zq[-1] - zq[-2])
    qw = qs + np.where(Q < 0.5, -adj, adj)[None, :]
    qx = np.column_stack([qw[:, 0] + lo_s * (norm_ppf(0.001) - zq[0]), qw, qw[:, -1] + hi_s * (norm_ppf(0.999) - zq[-1])])
    u = rng.uniform(0.001, 0.999, (len(sub), ND))
    dr = np.array([np.interp(u[i], QX, qx[i]) for i in range(len(sub))])
    hand = np.where(sub.stand_r.to_numpy() == 1, 1.0, -1.0)
    la, br = sub.launch_angle.to_numpy(float), sub.bearing.to_numpy(float)
    base = dict(v0=sub.launch_speed.to_numpy(float) * MPH, theta=np.deg2rad(la), phi=np.deg2rad(br), w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=(-hand * 864 - 75 * br) * RPM)
    rho0 = sub.air_density.to_numpy(float)
    fcm, wlm = fence[ix] * FT, wall[ix] * FT
    ph = np.zeros(len(sub))
    for d in range(ND):
        mult = np.exp(dr[:, d])
        for s0 in range(0, len(sub), 4000):
            sl = slice(s0, s0 + 4000)
            R, Z = fly_path(rho=rho0[sl] * mult[sl], **{k: v[sl] for k, v in base.items()})
            ph[sl] += clears(R, Z, fcm[sl], wlm[sl])
        if d % 6 == 5:
            print("  %s draw %d of %d (%d balls)" % (label, d + 1, ND, len(sub)), flush=True)
    full = np.zeros(len(df))
    full[ix] = ph / ND
    return full


df["dA"] = draws_prob(df.bearing_hat.to_numpy(float), fence_h, wall_h, "predict mode")
df["dB"] = draws_prob(df.bearing.to_numpy(float), fence_t, wall_t, "reconstruct mode")
df[["rid", "dA", "dB"]].to_parquet(ROOT + "data/derived/e9_draws.parquet")

# stack
names = {"xgb": "v7_stack/pred_xgb_v5r.parquet", "phys": "v7_stack/pred_diffphys_v3b.parquet", "lgb": "v7_stack/pred_lgbm_phys.parquet", "cat": "v7_stack/pred_cat.parquet", "mlp": "v7_stack/pred_mlp.parquet"}
logit = lambda p: np.log(np.clip(p, 1e-5, 1 - 1e-5) / (1 - np.clip(p, 1e-5, 1 - 1e-5)))
D = df.set_index("rid")
for k, f in names.items():
    D[k] = pd.read_parquet(ROOT + "data/derived/" + f).set_index("rid").p_hr.reindex(D.index)
D = D.dropna(subset=list(names))
va, te = D[D.split == "val"], D[D.split == "test"]
say("stack rows: validation %d, test %d (balls where every component has a prediction)" % (len(va), len(te)))
base_feats = [logit(D[k]) for k in names]


def mat(frame, extras):
    return np.column_stack([logit(frame[k]) for k in names] + [logit(np.clip(frame[e], 0.002, 0.998)) for e in extras] + ([] if not extras else [frame[extras[0]].to_numpy()]))


def fitpred(extras):
    clf = LogisticRegression(C=1.0, max_iter=2000).fit(mat(va, extras), va.y)
    return clf.predict_proba(mat(te, extras))[:, 1]


yt = te.y.to_numpy()
near = (te.margin_hat.abs() < 15).to_numpy()
oracle = (te.home_team == "SF").to_numpy()
brier = lambda p, m=slice(None): float(((p[m] - yt[m]) ** 2).mean())
res = {"stack (no draws)": fitpred([]), "stack + predict-mode draws": fitpred(["dA"]), "stack + reconstruct-mode draws": fitpred(["dB"])}
res["xgb alone"] = te.xgb.to_numpy()
res["draws alone (predict mode)"] = te.dA.to_numpy()
res["draws alone (reconstruct mode)"] = te.dB.to_numpy()
say("\n## Test Brier (%d balls; near-wall %d; Oracle %d)" % (len(te), near.sum(), oracle.sum()))
for k, p in res.items():
    say("  %-34s all %.5f   near-wall %.4f   Oracle %.5f" % (k, brier(p), brier(p, near), brier(p, oracle)))
games = te.game_pk.to_numpy()
ug, inv = np.unique(games, return_inverse=True)


def paired(pa, pb, label, m=None):
    m = np.ones(len(yt), bool) if m is None else m
    da = ((pb - yt) ** 2 - (pa - yt) ** 2) * m
    s, c = np.bincount(inv, da), np.bincount(inv, m.astype(float))
    r = np.random.default_rng(3)
    bs = []
    for _ in range(400):
        pick = r.integers(0, len(ug), len(ug))
        bs.append(s[pick].sum() / max(c[pick].sum(), 1))
    say("  %-52s %+0.5f  (95%% %+0.5f, %+0.5f)" % (label, s.sum() / c.sum(), *np.percentile(bs, [2.5, 97.5])))


say("\n## Paired differences (second minus first; negative = draws help)")
for lab, m in (("all", None), ("near-wall", near), ("Oracle", oracle)):
    paired(res["stack (no draws)"], res["stack + predict-mode draws"], "predict-mode draws in stack, " + lab, m)
for lab, m in (("all", None), ("near-wall", near)):
    paired(res["stack (no draws)"], res["stack + reconstruct-mode draws"], "reconstruct-mode draws in stack, " + lab, m)
open(ROOT + "science/e9_draws_in_stack.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
