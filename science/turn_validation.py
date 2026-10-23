"""Experiment E8 (GPT round-3 idea 4, first step): the sandbox hooks pulled balls hard (a ball set to 43 degrees right ended up 11 degrees foul). Is that real? The wood-bat TrackMan tables (Cape Cod and Frontier league)
record BOTH the launch direction and the landing bearing, plus measured batted-ball spin. For every ball with spin, direction, bearing and distance:
  observed turn = landing bearing - launch direction;
  simulated turn with (a) the measured spin, (b) the sandbox's spin prior (backspin max(0, -763 + 120 x launch angle), side spin -849 x hand - 94 x direction), (c) no side spin.
If (a) matches the observed turn the physics is sound; if (b) overshoots, the prior's hook is too strong. Also fits side spin against hand and direction from the measured spin to give a data-driven prior.
Fast (a few minutes). Output: science/turn_validation.md."""
import numpy as np
import pandas as pd

from flight_fit import MPH, RPM, simulate

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


frames = []
for f in ("woodbat_cape", "woodbat_frontier_wwt"):
    d = pd.read_parquet(ROOT + f"data/derived/{f}.parquet")
    d["src"] = f
    frames.append(d)
d = pd.concat(frames, ignore_index=True)
d = d[d.ExitSpeed.between(70, 120) & d.Angle.between(10, 50) & d.Distance.between(150, 440) & d.Direction.between(-45, 45) & d.Bearing.between(-60, 60) & d.HitSpinRate.between(1000, 6000) & d.HitSpinAxis.notna() & d.BatterSide.isin(["Right", "Left"])].reset_index(drop=True)
hand = np.where(d.BatterSide == "Right", 1.0, -1.0)
la, dr = d.Angle.to_numpy(float), d.Direction.to_numpy(float)
rad = np.deg2rad(d.HitSpinAxis.to_numpy(float))
rate = d.HitSpinRate.to_numpy(float) * RPM
base = dict(v0=d.ExitSpeed.to_numpy(float) * MPH, theta=np.deg2rad(la), phi=np.deg2rad(dr), z0=np.full(len(d), 1.0))
P = np.array([0.3728, 0.1492, 1.524, 2.5479])  # the sandbox's aerodynamics
meas_back, meas_side = -rate * np.cos(rad), rate * np.sin(rad)
sims = {
    "measured spin": simulate(P, w_back=meas_back, w_side=meas_side, **base),
    "sandbox prior": simulate(P, w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=(-hand * 849 - 94 * dr) * RPM, **base),
    "no side spin": simulate(P, w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=np.zeros(len(d)), **base),
}
obs_turn = d.Bearing.to_numpy(float) - dr
say("# Launch-to-landing turn on wood-bat TrackMan (22 Oct 2026): %d balls (Cape Cod and Frontier), spin measured" % len(d))
say("observed turn (landing bearing minus launch direction): mean %+.2f deg, sd %.2f deg" % (obs_turn.mean(), obs_turn.std()))
say("\n## Mean turn by launch direction (degrees; negative turn = toward the left-field line)")
say("%-14s %5s %9s %14s %14s %14s" % ("direction", "n", "observed", "measured spin", "sandbox prior", "no side spin"))
turns = {k: v[2] - dr for k, v in sims.items()}
for lo, hi in ((-45, -30), (-30, -15), (-15, 0), (0, 15), (15, 30), (30, 45)):
    m = (dr >= lo) & (dr < hi)
    say("%-14s %5d %+9.2f %+14.2f %+14.2f %+14.2f" % (f"{lo} to {hi}", m.sum(), obs_turn[m].mean(), turns["measured spin"][m].mean(), turns["sandbox prior"][m].mean(), turns["no side spin"][m].mean()))
say("\n## Pulled balls only (right-handers toward left field and left-handers toward right field, 15 to 45 degrees)")
pulled = (hand * dr < -15)
for k in turns:
    say("  %-14s mean turn %+.2f deg (observed %+.2f); mean absolute error per ball %.2f deg" % (k, (turns[k][pulled] * -hand[pulled]).mean(), (obs_turn[pulled] * -hand[pulled]).mean(), np.abs(turns[k][pulled] - obs_turn[pulled]).mean()))
say("  (turns expressed as degrees toward the foul line for pulled balls)")
say("\n## Per-ball error of the simulated turn (all balls), degrees: " + "; ".join("%s MAE %.2f" % (k, np.abs(turns[k] - obs_turn).mean()) for k in turns))
say("distance error with measured spin: mean %+.1f ft, MAE %.1f ft (the physics check)" % ((sims["measured spin"][0] / 0.3048 - d.Distance.to_numpy(float)).mean(), np.abs(sims["measured spin"][0] / 0.3048 - d.Distance.to_numpy(float)).mean()))
# data-driven side-spin prior from the measured spin
X = np.column_stack([np.ones(len(d)), hand, dr, hand * dr])
side_rpm = meas_side / RPM
coef, *_ = np.linalg.lstsq(X, side_rpm, rcond=None)
say("\n## Measured side spin (rpm) against hand and direction")
say("side spin = %.0f + %.0f x hand + %.1f x direction + %.1f x hand x direction;  the sandbox prior is 0 - 849 x hand - 94 x direction" % tuple(coef))
say("residual sd %.0f rpm (measured side spin varies a lot ball to ball); correlation of measured and fitted %.2f" % (np.std(side_rpm - X @ coef), np.corrcoef(side_rpm, X @ coef)[0, 1]))
say("share of balls where the sign of the measured side spin matches the prior's: %.2f" % np.mean(np.sign(side_rpm) == np.sign(-hand * 849 - 94 * dr)))
open(ROOT + "science/turn_validation.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
