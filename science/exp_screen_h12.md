# Feature sweep: screening

Pool: 292,203 balls from 2023-03-01 to 2025-05-31 (13,192 home runs, 5,728 games); 4-fold CV grouped by game. Baseline = the current legal feature set with bat tracking, no direction estimate. Baseline: HR Brier 0.01511, bearing MAE 12.85 deg, fly-ball distance MAE 12.69 ft.

Differences against the baseline (negative is better), 99% interval over games. KEEP needs a Brier gain of at least 0.0001, or more than 0.1 degree or 0.1 ft, with the interval below zero.

| ID | Hypothesis | Features | HR Brier diff | Bearing MAE diff (deg) | Distance MAE diff (ft) | Decision |
|---|---|---|---|---|---|---|
| H12 | In-game residual memory | 4 | +0.00014 (-0.00001, +0.00027) | +0.08 (+0.06, +0.10) | -0.01 (-0.05, +0.03) | **KILL** |
| H13 | Batter residual memory | 2 | +0.00001 (-0.00012, +0.00014) | +0.05 (+0.03, +0.06) | -0.11 (-0.16, -0.07) | **MAYBE** |
| H14 | Pitcher residual memory | 2 | +0.00008 (-0.00005, +0.00020) | +0.05 (+0.03, +0.07) | +0.01 (-0.02, +0.05) | **KILL** |
| H15 | League drift memory | 2 | +0.00011 (-0.00002, +0.00024) | +0.04 (+0.02, +0.06) | -0.04 (-0.08, -0.00) | **KILL** |
| H16 | Park by geometry, not team | 3 | +0.00014 (+0.00002, +0.00029) | -0.03 (-0.05, -0.01) | -0.08 (-0.12, -0.04) | **KILL** |

Prior expectations, written before the run:

- H12 In-game residual memory: Balls in one game share a distance miss (wind, air, ball; split-half r +0.30); expect a small distance gain, larger near the wall. Needs exp_features_h12.parquet from round3.py memory.
- H13 Batter residual memory: Batters carry a persistent distance miss (split-half r +0.42 to +0.50 on the test period, spread about 3 ft); expect a distance gain near the size of the contact-point gain (about 0.1 to 0.2 ft), plus a small near-wall gain. Residual-based, unlike the raw-average history groups that failed.
- H14 Pitcher residual memory: Weaker than batters (split-half r +0.15 to +0.25); expect little. Likely kill.
- H15 League drift memory: The model's near-wall home run rate is off by league-wide amounts that move by month (-3.0 points June 2025, +2.9 June 2026). A shrunk mean of the previous 30 days of home-run misses and 14 days of distance misses should absorb ball and season drift; expect a small Brier gain.
- H16 Park by geometry, not team: Team code does not identify a park (the Athletics moved to Sutter Health Park in 2025 and the model still reads Oakland). Dropping it and using fence distances, elevation, roof and turf should fix new-park and fence-change errors; expect a gain at the Athletics, Detroit and similar parks, possibly a loss at parks with idiosyncratic effects the geometry misses.
