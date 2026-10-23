"""Experiment E2 (GPT round-3 idea 3): does the Goner Grid depend on HOW a ball's extra carry is explained? Each real Giants ball (apps/web/public/replay.json) is fitted three ways so that the page's
physics reaches exactly its observed distance in its source park: (1) an air-density multiplier (the current 'carry'), (2) extra backspin with the drag law fixed, (3) a drag-coefficient multiplier with
spin fixed. All three agree at the source park by construction. Each reconstruction is then flown through all 30 parks (each park's pressure, fence distance and wall height at the ball's bearing) and the
30-park clearance vectors are compared. Kill rule from GPT: if the three mechanisms differ in under 1 percentage point of park-level clearances, carry-only is a sufficient transport state.
Runs at below-normal priority, about 10 minutes. Output: science/transport_test.md."""
import json

import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import ROOT, clears, fly_path

out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


R = json.load(open(ROOT + "apps/web/public/replay.json"))
b = pd.DataFrame(R["balls"])
b = b[b.ft.between(300, 460) & b.hpa.notna() & b.rho.notna()].reset_index(drop=True)
n = len(b)
hand = np.where(b.s == "R", 1.0, -1.0)
la, br, ev = b.la.to_numpy(float), b.dir.to_numpy(float), b.ev.to_numpy(float)
w_back0 = np.maximum(0, -763 + 120 * la)
w_side = (-hand * 849 - 94 * br + b.dws.to_numpy(float)) * RPM
rho0, target, pball = b.rho.to_numpy(float), b.ft.to_numpy(float), b.hpa.to_numpy(float)
base = dict(v0=ev * MPH, theta=np.deg2rad(la), phi=np.deg2rad(br), w_side=w_side)


def dist(rho, wb_add=None, kd=None):
    wb = (w_back0 + (0 if wb_add is None else wb_add)) * RPM
    R_, _ = fly_path(rho=rho, w_back=wb, kd=kd, **base)
    return R_[:, -1] / FT


def bisect(f, lo, hi, increasing, it=12):
    lo, hi = np.full(n, float(lo)), np.full(n, float(hi))
    for _ in range(it):
        mid = 0.5 * (lo + hi)
        too_far = f(mid) > target
        go_down = too_far if increasing else ~too_far
        hi = np.where(go_down, mid, hi)
        lo = np.where(go_down, lo, mid)
    return 0.5 * (lo + hi)


say("# Cross-altitude transport test (22 Oct 2026): %d real Giants balls, 300 to 460 ft projected distance" % n)
m_den = bisect(lambda m: dist(rho0 * m), 0.3, 1.8, increasing=False)
d_spin = bisect(lambda d: dist(rho0, wb_add=d), -2500, 3500, increasing=True)
k_drag = bisect(lambda k: dist(rho0, kd=k), 0.4, 1.6, increasing=False)
fits = {"density": dist(rho0 * m_den), "backspin": dist(rho0, wb_add=d_spin), "drag": dist(rho0, kd=k_drag)}
ok = np.ones(n, bool)
for k, v in fits.items():
    good = np.abs(v - target) < 3
    say("  %-9s matches the observed distance within 3 ft for %.1f%% of balls" % (k, 100 * good.mean()))
    ok &= good
say("  keeping the %d balls all three mechanisms fit (%.1f%%)" % (ok.sum(), 100 * ok.mean()))
say("  fitted parameters: density multiplier median %.2f (5-95%%: %.2f to %.2f); extra backspin median %+.0f rpm (5-95%%: %+.0f to %+.0f); drag multiplier median %.2f (%.2f to %.2f)" % (
    np.median(m_den), *np.percentile(m_den, [5, 95]), np.median(d_spin), *np.percentile(d_spin, [5, 95]), np.median(k_drag), *np.percentile(k_drag, [5, 95])))

parks = json.load(open(ROOT + "apps/web/public/parks30.json"))
B = np.array(parks["bearings"])
cls = np.digitize(np.array([p["hpa"] for p in parks["parks"]]), [900, 982, 994, 1002, 1009])
names = [p["abbr"] for p in parks["parks"]]
clear = {k: np.zeros((n, len(names)), bool) for k in fits}
for ci in np.unique(cls):
    mem = [i for i in range(len(names)) if cls[i] == ci]
    hcls = float(np.mean([parks["parks"][i]["hpa"] for i in mem]))
    ratio = hcls / pball
    sims = {
        "density": fly_path(rho=rho0 * m_den * ratio, w_back=w_back0 * RPM, **base),
        "backspin": fly_path(rho=rho0 * ratio, w_back=(w_back0 + d_spin) * RPM, **base),
        "drag": fly_path(rho=rho0 * ratio, w_back=w_back0 * RPM, kd=k_drag, **base),
    }
    for i in mem:
        p = parks["parks"][i]
        fence, wall = np.interp(br, B, p["dist"]) * FT, np.interp(br, B, p["height"]) * FT
        for k, (Rr, Z) in sims.items():
            clear[k][:, i] = clears(Rr, Z, fence, wall)
    print("  pressure class", ci, flush=True)

say("\n## Disagreement between the three reconstructions across the 30 parks (balls kept: %d)" % ok.sum())
keys = list(fits)
pairs = [("density", "backspin"), ("density", "drag"), ("backspin", "drag")]
for a_, b_ in pairs:
    diff = clear[a_][ok] != clear[b_][ok]
    cnt = np.abs(clear[a_][ok].sum(1) - clear[b_][ok].sum(1))
    say("  %-9s vs %-9s: park-level clearances differ for %.2f%% of ball-park pairs; %.1f%% of balls have at least one park that differs; mean change in parks cleared %.2f" % (a_, b_, 100 * diff.mean(), 100 * diff.any(1).mean(), cnt.mean()))
diff_any = np.zeros((ok.sum(), len(names)), bool)
for a_, b_ in pairs:
    diff_any |= clear[a_][ok] != clear[b_][ok]
per_park = pd.Series(diff_any.mean(0), index=names).sort_values(ascending=False)
say("  parks where the mechanisms disagree most (share of balls): " + ", ".join("%s %.1f%%" % (k, 100 * v) for k, v in per_park.head(8).items()))
alt = {n_: parks["parks"][i]["hpa"] for i, n_ in enumerate(names)}
hi = [n_ for n_ in names if alt[n_] < 985]
say("  high-altitude parks (pressure under 985 hPa: %s): mean share of balls with a disagreement %.1f%%; sea-level parks %.1f%%" % (", ".join(hi), 100 * per_park[hi].mean(), 100 * per_park.drop(hi).mean()))
say("  mean parks cleared per ball: density %.2f, backspin %.2f, drag %.2f" % tuple(clear[k][ok].sum(1).mean() for k in keys))
pct = 100 * np.mean([(clear[a_][ok] != clear[b_][ok]).mean() for a_, b_ in pairs])
say("\nreading: average park-level disagreement %.2f%% (kill rule: under 1%% means carry alone is a sufficient transport state; well above it means the Goner Grid carries a model-form uncertainty that one carry number hides)." % pct)
open(ROOT + "science/transport_test.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
