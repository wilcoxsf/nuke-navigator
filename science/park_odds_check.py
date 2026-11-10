# Per-park wall odds, checked forward in time (10 Nov 2026). Andrew: "Yes to 1 and 3, and then 2 once we figure out the 'best' way to do this at oracle".
# Oracle's best wall is the park model's crest (oracle_wall_fit.md) plus its own odds offset (the flight runs about 3 ft short there). Does every park want its own
# offset too? Fit on 2023-2024, score on 2025-2026, from data/derived/otherpark/balls.parquet (written by otherpark_study.py; same flights, same walls).
import numpy as np, pandas as pd
from sklearn.linear_model import LogisticRegression

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
b = pd.read_parquet(ROOT + "data/derived/otherpark/balls.parquet")
b["park"] = b["team"] + "@" + b["venue_id"].astype(str)
tr, te = b[b.game_year <= 2024].copy(), b[b.game_year >= 2025].copy()
brier = lambda p, y: float(np.mean((p - y) ** 2))
X = lambda d: d[["clear"]].clip(-40, 40).values

pool = LogisticRegression(C=1e6).fit(X(tr), tr.y)
te["p_pool"] = pool.predict_proba(X(te))[:, 1]
out = ["# Per-park wall odds, fit 2023-2024, scored 2025-2026", f"- balls scored: {len(te):,} at {te.park.nunique()} park-venues; home runs {te.y.mean():.1%}"]
for C in (0.05, 0.3, 3.0):  # how hard each park's own offset and slope are pulled toward the pooled odds (smaller = harder)
    parks = sorted(b.park.unique())
    def design(d):
        oh = np.zeros((len(d), 2 * len(parks)))
        idx = d.park.map({p: i for i, p in enumerate(parks)}).values
        c = d["clear"].clip(-40, 40).values
        oh[np.arange(len(d)), idx] = 1.0
        oh[np.arange(len(d)), len(parks) + idx] = c / 10
        return np.column_stack([c, oh])
    m = LogisticRegression(C=C, max_iter=5000).fit(design(tr), tr.y)
    te[f"p_park{C}"] = m.predict_proba(design(te))[:, 1]
cols = ["p_pool"] + [c for c in te.columns if c.startswith("p_park")]
out.append("## All parks (lower Brier is better; hard call = the physics at clearance 0)")
out.append(f"- hard call: wrong {np.mean((te.clear > 0) != (te.y > 0.5)):.1%}")
for c in cols:
    out.append(f"- {c}: Brier {brier(te[c], te.y):.4f}; wrong {np.mean((te[c] > 0.5) != (te.y > 0.5)):.1%}")
# bootstrap by game for the best per-park against pooled
best = min(cols[1:], key=lambda c: brier(te[c], te.y))
g = te.groupby("game_pk")
gs = [(d[best].values, d.p_pool.values, d.y.values) for _, d in g]
rng = np.random.default_rng(7); diffs = []
for _ in range(400):
    pick = rng.integers(0, len(gs), len(gs))
    a = np.concatenate([gs[i][0] for i in pick]); p0 = np.concatenate([gs[i][1] for i in pick]); y = np.concatenate([gs[i][2] for i in pick])
    diffs.append(brier(a, y) - brier(p0, y))
lo, hi = np.percentile(diffs, [2.5, 97.5])
out.append(f"- {best} minus pooled: {brier(te[best], te.y) - brier(te.p_pool, te.y):+.4f} (95% {lo:+.4f} to {hi:+.4f}, games resampled)")
out.append(f"## By park, 2025-2026 ({best} against pooled; where the hard call misses most)")
rows = []
for p, d in te.groupby("park"):
    rows.append((np.mean((d.clear > 0) != (d.y > 0.5)), p, len(d), brier(d.p_pool, d.y), brier(d[best], d.y), np.mean((d[best] > 0.5) != (d.y > 0.5))))
for e, p, n, b0, b1, w1 in sorted(rows, reverse=True)[:12]:
    out.append(f"- {p}: {n:,} balls; hard call wrong {e:.1%}; pooled Brier {b0:.4f}, own odds Brier {b1:.4f} (wrong {w1:.1%})")
sf = te[te.team == "SF"]
out.append(f"- Oracle with the Oracle-only odds the app uses today (logistic(0.575 x clear + 1.585)): Brier {brier(1 / (1 + np.exp(-(0.5754 * sf.clear.clip(-40, 40) + 1.585))), sf.y):.4f}  (in-sample for 2025-2026: it was fit on all four seasons)")
open(ROOT + "science/park_odds_check.md", "w").write("\n".join(out) + "\n")
print("\n".join(out))
