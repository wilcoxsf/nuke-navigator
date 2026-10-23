"""Two audits GPT asked for in its round-3 answer (GPT-RESEARCH-BRIEF-3 follow-up).

A. Selection bias. Real home runs landed about 13 ft past the spin-prior physics (non-home-runs about +2 ft). GPT's point: that gap is what you get even from an UNBIASED predictor, because a ball
   becomes a home run only when its error is positive. Test: among hard-hit fly balls (95+ mph, 20-40 deg) bin by the PREDICTED margin over the fence (simulated distance minus the park's fence
   distance at that bearing) and show the mean error (simulated minus Statcast projected distance) for all balls, for home runs and for non-home-runs in each bin. An unbiased predictor shows
   about 0 for all balls in every bin, a positive split for home runs and a negative one for non-home-runs.
B. Carry inversion. For the same balls: carry by bisection, local sensitivity J = dD/dlog(carry) from two extra flights, how often the root hits its bounds, how log carry's spread depends on
   sensitivity (a small |J| means a few feet of distance noise becomes a big carry swing).
Runs at below-normal priority, about 6 minutes. Output: science/carry_audit.md."""
import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import ROOT, fly_path

out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


df = pd.read_parquet(ROOT + "data/derived/exp_features.parquet", columns=["game_year", "game_date", "type", "launch_speed", "launch_angle", "bearing", "hit_distance_sc", "air_density", "stand_r", "y", "dim_left_line", "dim_center", "dim_right_line"])
df = df[(df.game_year == 2025) & (df.type == "X") & df.launch_speed.between(95, 125) & df.launch_angle.between(20, 40) & df.bearing.between(-44, 44) & df.hit_distance_sc.between(250, 480) & df.air_density.notna() & df.dim_center.notna()].sample(12000, random_state=2).reset_index(drop=True)
hand = np.where(df.stand_r == 1, 1.0, -1.0)
la, br = df.launch_angle.to_numpy(float), df.bearing.to_numpy(float)
base = dict(v0=df.launch_speed.to_numpy(float) * MPH, theta=np.deg2rad(la), phi=np.deg2rad(br), w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=(-hand * 849 - 94 * br) * RPM)
rho0, target = df.air_density.to_numpy(float), df.hit_distance_sc.to_numpy(float)
n, CH = len(df), 4000


def flown(mult):
    d = np.zeros(n)
    for s in range(0, n, CH):
        sl = slice(s, s + CH)
        R, _ = fly_path(rho=rho0[sl] * mult[sl], **{k: v[sl] for k, v in base.items()})
        d[sl] = R[:, -1] / FT
    return d


sim = flown(np.ones(n))
fence = np.where(br < 0, df.dim_center + (df.dim_left_line - df.dim_center) * (-br / 45), df.dim_center + (df.dim_right_line - df.dim_center) * (br / 45)).astype(float)
margin = sim - fence
err = sim - target
hr = df.y.to_numpy() == 1
say("# Carry audit (22 Oct 2026), %d hard-hit fly balls from 2025 (95+ mph, 20 to 40 deg)" % n)
say("\n## A. Selection bias: error (simulated minus projected distance, feet) by predicted margin over the fence")
say("overall: mean error %.1f ft (all), %.1f ft (home runs, n %d), %.1f ft (non-home-runs); home-run share %.3f" % (err.mean(), err[hr].mean(), hr.sum(), err[~hr].mean(), hr.mean()))
bins = [-120, -50, -30, -15, -5, 5, 15, 30, 50, 120]
say("%-14s %6s %8s %12s %12s %12s" % ("predicted margin", "n", "HR rate", "all balls", "home runs", "non-HRs"))
for lo, hi in zip(bins[:-1], bins[1:]):
    s = (margin >= lo) & (margin < hi)
    if s.sum() < 30:
        continue
    say("%-14s %6d %8.3f %+12.1f %+12.1f %+12.1f" % (f"{lo} to {hi} ft", s.sum(), hr[s].mean(), err[s].mean(), err[s & hr].mean() if (s & hr).sum() else float("nan"), err[s & ~hr].mean()))
say("reading: if 'all balls' stays near 0 in every bin while home runs read positive-error and non-home-runs negative, the 13 ft gap is selection, not a biased spin prior.")

say("\n## B. Carry inversion")
lo_, hi_ = np.full(n, 0.2), np.full(n, 1.8)
for k in range(11):
    mid = 0.5 * (lo_ + hi_)
    too_far = flown(mid) > target
    lo_, hi_ = np.where(too_far, mid, lo_), np.where(too_far, hi_, mid)
    print("  carry pass", k + 1, flush=True)
m = 0.5 * (lo_ + hi_)
J = (flown(m * np.exp(0.01)) - flown(m * np.exp(-0.01))) / 0.02  # feet per unit of log carry
logm = np.log(m)
say("log carry: mean %.3f, sd %.3f; carry multiplier 5th/50th/95th percentile %.2f / %.2f / %.2f" % (logm.mean(), logm.std(), *np.percentile(m, [5, 50, 95])))
say("roots at the search bounds (carry under 0.25 or over 1.7): %.2f%%" % (100 * np.mean((m < 0.25) | (m > 1.7))))
say("sensitivity J = dD/dlog(carry), feet per unit: 5th %.0f, median %.0f, 95th %.0f; share with |J| under 30: %.2f" % (*np.percentile(np.abs(J), [5, 50, 95]), np.mean(np.abs(J) < 30)))
med = np.median(np.abs(J))
say("sd of log carry where |J| is below the median: %.3f; above the median: %.3f (a larger spread where distance is less sensitive means noisier carry labels)" % (logm[np.abs(J) < med].std(), logm[np.abs(J) >= med].std()))
for lo, hi in ((20, 26), (26, 30), (30, 34), (34, 40)):
    s = (la >= lo) & (la < hi)
    say("  launch angle %d to %d deg: median |J| %.0f ft per unit log carry, sd of log carry %.3f, mean log carry %+.3f" % (lo, hi, np.median(np.abs(J[s])), logm[s].std(), logm[s].mean()))
say("\nnote: a 5 ft distance error moves log carry by about 5 / median|J| = %.3f, compared with the observed spread %.3f." % (5 / med, logm.std()))
open(ROOT + "science/carry_audit.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
