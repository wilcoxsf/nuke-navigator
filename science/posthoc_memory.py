"""Residual memory as a post-hoc layer, not a model input (26 Oct 2026). Venue offsets failed as an input (v42) but worked as a monthly prequential offset on the finished model; the same may hold for the memories that failed as inputs in round 3 (H12 in-game, H13 batter: real signals, split-half +0.30 and +0.42..0.50).
Distance miss of a fly ball = hit_distance_sc - mlp_d (v39c out-of-fold distance head: out-of-fold for 2015-2024, full-train models for 2025-26). Memories, each from strictly earlier balls only:
  gm   shrunk mean miss of earlier fly balls in the same game (order: at_bat_number, pitch_number), k = 4
  ven  shrunk mean miss at the same venue over the previous 3 calendar days (same series weather), k = 20
  bt   batter: decayed shrunk mean of his earlier fly-ball misses across all seasons (decay 0.995 per ball), k = 15
  pt   pitcher: same, k = 25
Layer: logit(p) = a * logit(p_stack) + b + c_venue + sum_j (beta_j * f_j + gamma_j * f_j * bump), bump = exp(-(margin_hat / 30)^2), f in feet / 10. Refit before each test month on validation plus earlier test months (ridge 30 on venue offsets only), as recalibrate.py.
Usage: python science/posthoc_memory.py [--pred data/derived/final8/S3.parquet]"""
import argparse

import numpy as np
import pandas as pd
from scipy.optimize import minimize

ap = argparse.ArgumentParser()
ap.add_argument("--pred", default="data/derived/final8/S3.parquet")
ap.add_argument("--write", default="", help="also write the final layer (venue offsets + gm) test-row predictions to this parquet")
ap.add_argument("--period", default="M", help="refit cadence: M monthly, W weekly")
ap.add_argument("--score-post", action="store_true", help="(9 Nov) --write also predicts the sealed rows (split post), fit on val and test history only; nothing printed covers them")
ap.add_argument("--table", default="bakeoff_features_v5r.parquet", help="bakeoff_features_fwd2024.parquet for the 2024 forward split")
a = ap.parse_args()
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
import modelstore as MS  # (9 Nov: NN_D points at the production tables)
D = MS.D
df = pd.read_parquet(D + a.table, columns=["rid", "split", "y", "game_date", "game_pk", "venue_id", "margin_hat", "hit_distance_sc", "launch_angle", "launch_speed"])
df = df.merge(pd.read_parquet(D + "bakeoff_features.parquet", columns=["rid", "batter", "pitcher", "at_bat_number", "pitch_number"]), on="rid")
df = df.merge(pd.read_parquet(D + "bakeoff_features_v39c.parquet", columns=["rid", "mlp_d"]), on="rid")
df = df.sort_values(["game_date", "game_pk", "at_bat_number", "pitch_number"]).reset_index(drop=True)
fly = (df.launch_angle >= 15) & (df.launch_speed >= 80) & df.hit_distance_sc.notna() & df.mlp_d.notna()
dres = np.where(fly, df.hit_distance_sc - df.mlp_d, np.nan)
print("fly balls %d; distance miss mean %+.1f ft, sd %.1f; corr(mlp_d, hit_distance) %.3f" % (fly.sum(), np.nanmean(dres), np.nanstd(dres), np.corrcoef(df.mlp_d[fly], df.hit_distance_sc[fly])[0, 1]))
df["dres"] = dres
r0 = np.nan_to_num(dres)
ok = np.isfinite(dres).astype(float)


def grp_prior(key, k):
    s = pd.Series(r0).groupby(key).cumsum().to_numpy() - r0
    c = pd.Series(ok).groupby(key).cumsum().to_numpy() - ok
    return s / (c + k)


df["gm"] = grp_prior(df.game_pk.to_numpy(), 4.0)
day = pd.to_datetime(df.game_date).dt.normalize()
vd = pd.DataFrame({"v": df.venue_id.astype(int), "day": day, "s": r0, "c": ok}).groupby(["v", "day"])[["s", "c"]].sum().reset_index()
parts = []
for v, g in vd.groupby("v"):
    g = g.set_index("day")[["s", "c"]].asfreq("D", fill_value=0.0)
    r = g.rolling(3, min_periods=1).sum().shift(1).fillna(0.0)
    parts.append(pd.DataFrame({"v": v, "day": r.index, "ven": (r.s / (r.c + 20.0)).to_numpy()}))
vm = pd.concat(parts)
df["ven"] = df[["venue_id"]].astype(int).rename(columns={"venue_id": "v"}).assign(day=day).merge(vm, on=["v", "day"], how="left").ven.fillna(0.0).to_numpy()


def decayed(key, k, decay=0.995):
    out = np.zeros(len(df))
    m, w = {}, {}
    keys = df[key].to_numpy()
    for i in range(len(df)):  # strictly earlier balls: read before update
        kk = keys[i]
        mm, ww = m.get(kk, 0.0), w.get(kk, 0.0)
        out[i] = mm / (ww + k)
        if ok[i]:
            m[kk], w[kk] = mm * decay + r0[i], ww * decay + 1.0
    return out


df["bt"] = decayed("batter", 15.0)
df["pt"] = decayed("pitcher", 25.0)
p = pd.read_parquet(ROOT + a.pred).set_index("rid").p_hr
d = df.set_index("rid").join(p, how="inner").dropna(subset=["p_hr"])
d = d[d.split.isin(["val", "test", "post"] if a.score_post else ["val", "test"])].copy()
post_mask = (d.split == "post").to_numpy()
te_mask = (d.split == "test").to_numpy()
ownres = d.dres.to_numpy()
mf = te_mask & np.isfinite(ownres)
print("\nreliability on test fly balls (corr of memory with the ball's own distance miss):")
for f in ("gm", "ven", "bt", "pt"):
    print("  %-4s r = %+.3f   sd of memory %.2f ft" % (f, np.corrcoef(d[f].to_numpy()[mf], ownres[mf])[0, 1], d[f].to_numpy()[mf].std()))

d["month"] = pd.to_datetime(d.game_date).dt.to_period(a.period)
d["lg"] = np.log(np.clip(d.p_hr, 1e-6, 1 - 1e-6) / (1 - np.clip(d.p_hr, 1e-6, 1 - 1e-6)))
vi = {v: i for i, v in enumerate(sorted(d.venue_id.astype(int).unique()))}
d["k"] = d.venue_id.astype(int).map(vi)
P = len(vi)
bump = np.exp(-((d.margin_hat.fillna(-999).to_numpy() / 30.0) ** 2))
sig = lambda z: 1 / (1 + np.exp(-z))
LAM = 30.0


def design(idx, feats):
    cols = []
    for f in feats:
        x = d[f].to_numpy()[idx] / 10.0
        cols += [x, x * bump[idx]]
    return np.column_stack(cols) if cols else np.zeros((len(idx), 0))


def fit(idx, feats):
    X, x, y, k = design(idx, feats), d.lg.to_numpy()[idx], d.y.to_numpy()[idx], d.k.to_numpy()[idx]
    m = X.shape[1]

    def f(t):
        z = t[0] * x + t[1] + X @ t[2:2 + m] + t[2 + m:][k]
        q = sig(z)
        r = q - y
        nll = -(y * np.log(np.clip(q, 1e-12, 1)) + (1 - y) * np.log(np.clip(1 - q, 1e-12, 1))).sum() + 0.5 * LAM * (t[2 + m:] ** 2).sum()
        return nll, np.concatenate([[(r * x).sum(), r.sum()], X.T @ r, np.bincount(k, weights=r, minlength=P) + LAM * t[2 + m:]])
    t0 = np.zeros(2 + m + P)
    t0[0] = 1
    return minimize(f, t0, jac=True, method="L-BFGS-B").x


def run(feats):
    q = np.zeros(len(d))
    tidx = np.flatnonzero(te_mask)
    months = d.month.to_numpy()
    for mth in sorted(d.month[te_mask].unique()):
        hist = np.flatnonzero((~te_mask & ~post_mask) | (te_mask & (months < mth)))  # (the sealed rows are never history)
        t = fit(hist, feats)
        sel = np.flatnonzero(te_mask & (months == mth))
        X = design(sel, feats)
        m = X.shape[1]
        q[sel] = sig(t[0] * d.lg.to_numpy()[sel] + t[1] + X @ t[2:2 + m] + t[2 + m:][d.k.to_numpy()[sel]])
    return q[tidx], t


te = d[te_mask]
y = te.y.to_numpy()
gid = pd.factorize(te.game_pk)[0]
G = gid.max() + 1
near = te.margin_hat.abs().lt(30).to_numpy()
oracle = (te.venue_id.astype(int) == 2395).to_numpy()


def ci(dd_, mask=None, n=1000):
    w = np.ones(len(dd_)) if mask is None else mask.astype(float)
    s, c = np.bincount(gid, weights=dd_ * w, minlength=G), np.bincount(gid, weights=w, minlength=G)
    r = np.random.default_rng(3)
    return np.percentile([s[i].sum() / c[i].sum() for i in (r.integers(0, G, G) for _ in range(n))], [2.5, 97.5])


base, _ = run([])
bb = lambda q, mk=slice(None): float(((q - y) ** 2)[mk].mean())
print("\nraw stack %.5f; venue offsets only %.5f (%+.5f)" % (bb(te.p_hr.to_numpy()), bb(base), bb(base) - bb(te.p_hr.to_numpy())))
for feats in ((["gm"],) if a.period != "M" else (["gm"], ["ven"], ["bt"], ["pt"], ["gm", "ven", "bt"], ["gm", "ven", "bt", "pt"])):
    q, t = run(feats)
    dd_ = (q - y) ** 2 - (base - y) ** 2
    lo, hi = ci(dd_)
    nlo, nhi = ci(dd_, near)
    print("%-16s %.5f  vs venue-only %+.6f (95%% %+.6f, %+.6f)  near-wall %+.5f (%+.5f, %+.5f)  Oracle %+.5f   betas %s" % (
        "+".join(feats), bb(q), dd_.mean(), lo, hi, dd_[near].mean(), nlo, nhi, dd_[oracle].mean(), np.round(t[2:2 + 2 * len(feats)], 3)))
if a.write:  # the adopted layer: global slope and intercept, venue offsets, in-game carry (gm)
    q, _ = run(["gm"])
    W = pd.DataFrame({"rid": te.index.to_numpy(), "p_hr": q})
    if a.score_post and post_mask.any():  # the sealed rows, month by month, fit on val and the test months before each (never on sealed rows)
        months = d.month.to_numpy(); qp = np.zeros(len(d))
        for mth in sorted(d.month[post_mask].unique()):
            hist = np.flatnonzero((~te_mask & ~post_mask) | (te_mask & (months < mth)))
            t = fit(hist, ["gm"]); sel = np.flatnonzero(post_mask & (months == mth)); X = design(sel, ["gm"]); m = X.shape[1]
            qp[sel] = sig(t[0] * d.lg.to_numpy()[sel] + t[1] + X @ t[2:2 + m] + t[2 + m:][d.k.to_numpy()[sel]])
        W = pd.concat([W, pd.DataFrame({"rid": d.index[post_mask] if d.index.name == "rid" else d.rid.to_numpy()[post_mask], "p_hr": qp[post_mask]})], ignore_index=True)
    W.to_parquet(ROOT + a.write)
    print("wrote", a.write, len(q))
