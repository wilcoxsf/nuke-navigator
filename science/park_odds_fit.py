# Each park's own wall odds for the app (10 Nov 2026; follows park_odds_check.md). The app flies every park against today's crest, so each park's odds are fit on
# the seasons whose fence matches that crest (fences_by_year.json same_as_crest; Oracle all four), pulled toward the pooled odds. Checked first: fit on
# crest seasons up to 2025, scored on 2026. Then refit on all crest seasons and written into apps/web/public/wall_odds.json as "parks" (SF and all kept).
import json, numpy as np, pandas as pd
from sklearn.linear_model import LogisticRegression

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
b = pd.read_parquet(ROOT + "data/derived/otherpark/balls.parquet")
F = json.load(open(ROOT + "apps/web/public/fences_by_year.json"))["fences"]
b["crest"] = [t == "SF" or bool(F.get(f"{t}:{y}", {}).get("same_as_crest")) for t, y in zip(b.team, b.game_year)]
cr = b[b.crest].copy()
brier = lambda p, y: float(np.mean((p - y) ** 2))
C_SHRINK = 3.0  # park_odds_check.md: 3.0 scored best forward (0.05 and 0.3 close behind)

def fit(d, parks):
    def design(x):
        idx = x.team.map({p: i for i, p in enumerate(parks)}).values
        c = x["clear"].clip(-40, 40).values
        m = np.zeros((len(x), 2 * len(parks))); m[np.arange(len(x)), idx] = 1.0; m[np.arange(len(x)), len(parks) + idx] = c / 10
        return np.column_stack([c, m])
    m = LogisticRegression(C=C_SHRINK, max_iter=5000).fit(design(d), d.y)
    k0, a0 = m.coef_[0][0], m.intercept_[0]
    co = {p: {"k": float(k0 + m.coef_[0][1 + len(parks) + i] / 10), "a": float(a0 + m.coef_[0][1 + i])} for i, p in enumerate(parks)}
    return co, design, m

sig = lambda z: 1 / (1 + np.exp(-z))
out = ["# Each park's wall odds on its own crest", f"- balls on seasons that match today's crest: {len(cr):,} at {cr.team.nunique()} parks"]
tr, te = cr[cr.game_year <= 2025], cr[cr.game_year == 2026]
parks = sorted(tr.team.unique())
co, _, _ = fit(tr, parks)
pool = LogisticRegression(C=1e6).fit(tr[["clear"]].clip(-40, 40).values, tr.y)
te = te[te.team.isin(parks)].copy()
te["p_pool"] = pool.predict_proba(te[["clear"]].clip(-40, 40).values)[:, 1]
te["p_own"] = [sig(co[t]["k"] * min(max(c, -40), 40) + co[t]["a"]) for t, c in zip(te.team, te.clear)]
out.append(f"## Fit on crest seasons to 2025, scored on 2026 ({len(te):,} balls at {te.team.nunique()} parks; KC has no crest season before 2026)")
out.append(f"- hard call wrong {np.mean((te.clear > 0) != (te.y > 0.5)):.1%}; pooled odds Brier {brier(te.p_pool, te.y):.4f}; each park's own odds Brier {brier(te.p_own, te.y):.4f}")
gs = [(d.p_own.values, d.p_pool.values, d.y.values) for _, d in te.groupby("game_pk")]
rng = np.random.default_rng(7); diffs = []
for _ in range(400):
    pk = rng.integers(0, len(gs), len(gs)); y = np.concatenate([gs[i][2] for i in pk])
    diffs.append(brier(np.concatenate([gs[i][0] for i in pk]), y) - brier(np.concatenate([gs[i][1] for i in pk]), y))
lo, hi = np.percentile(diffs, [2.5, 97.5])
out.append(f"- own minus pooled: {brier(te.p_own, te.y) - brier(te.p_pool, te.y):+.4f} (95% {lo:+.4f} to {hi:+.4f}, games resampled)")
for t in ["BAL", "ATH", "TB", "SF", "PIT", "COL"]:
    d = te[te.team == t]
    if len(d): out.append(f"- {t} 2026: {len(d):,} balls; hard call wrong {np.mean((d.clear > 0) != (d.y > 0.5)):.1%}; pooled Brier {brier(d.p_pool, d.y):.4f}, own {brier(d.p_own, d.y):.4f}")
# final: all crest seasons
allp = sorted(cr.team.unique())
co, _, _ = fit(cr, allp)
W = json.load(open(ROOT + "apps/web/public/wall_odds.json"))
W["parks"] = {t: {"k": round(v["k"], 4), "a": round(v["a"], 4)} for t, v in co.items()}
W["note"] = "P(out) = logistic(k x clearance_ft + a): SF and all from science/otherpark_study.py, parks (each on its own crest seasons, pulled toward the pooled) from science/park_odds_fit.py, 10 Nov 2026"
json.dump(W, open(ROOT + "apps/web/public/wall_odds.json", "w"), indent=1)
out.append("## Each park's odds now in the app (the clearance where a ball is a coin flip; Oracle's own fit is logistic(0.575 x clear + 1.585), coin flip at -2.8 ft)")
for t, v in sorted(co.items(), key=lambda kv: -kv[1]["a"] / kv[1]["k"]):
    out.append(f"- {t}: k {v['k']:.3f}, a {v['a']:+.3f}; coin flip at {-v['a'] / v['k']:+.1f} ft ({int((cr.team == t).sum()):,} balls)")
open(ROOT + "science/park_odds_fit.md", "w").write("\n".join(out) + "\n")
print("\n".join(out))
