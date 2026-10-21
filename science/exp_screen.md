# Feature sweep: screening

Pool: 292,203 balls from 2023-03-01 to 2025-05-31 (13,192 home runs, 5,728 games); 4-fold CV grouped by game. Baseline = the current legal feature set with bat tracking, no direction estimate. Baseline: HR Brier 0.01511, bearing MAE 12.85 deg, fly-ball distance MAE 12.69 ft.

Differences against the baseline (negative is better), 99% interval over games. KEEP needs a Brier gain of at least 0.0001, or more than 0.1 degree or 0.1 ft, with the interval below zero.

| ID | Hypothesis | Features | HR Brier diff | Bearing MAE diff (deg) | Distance MAE diff (ft) | Decision |
|---|---|---|---|---|---|---|
| H1 | Contact point | 4 | -0.00003 (-0.00018, +0.00011) | -0.22 (-0.24, -0.20) | -0.05 (-0.09, -0.01) | **KEEP** |
| H2 | Pitch approach and release | 15 | -0.00005 (-0.00017, +0.00009) | -0.02 (-0.03, -0.00) | -0.07 (-0.12, -0.03) | **MAYBE** |
| H3 | Arm angle and break | 4 | +0.00012 (-0.00001, +0.00025) | +0.11 (+0.09, +0.12) | -0.02 (-0.06, +0.03) | **KILL** |
| H4 | Contact quality | 7 | -0.00000 (-0.00013, +0.00011) | -0.28 (-0.30, -0.26) | -0.10 (-0.15, -0.06) | **KEEP** |
| H5 | Batter swing history | 6 | +0.00005 (-0.00007, +0.00019) | +0.06 (+0.05, +0.08) | -0.02 (-0.06, +0.02) | **KILL** |
| H6 | Game context | 10 | +0.00008 (-0.00004, +0.00021) | -0.03 (-0.04, -0.01) | +0.02 (-0.01, +0.06) | **KILL** |
| H7 | Fielding alignment | 2 | +0.00007 (-0.00005, +0.00019) | +0.07 (+0.06, +0.09) | +0.01 (-0.03, +0.04) | **KILL** |
| H8 | Era trend | 1 | +0.00004 (-0.00009, +0.00016) | +0.02 (+0.00, +0.03) | -0.06 (-0.09, -0.01) | **KILL** |
| H9 | Park-year | 1 | +0.00027 (+0.00013, +0.00043) | +0.19 (+0.17, +0.20) | +0.09 (+0.04, +0.13) | **KILL** |
| H10 | Long history windows | 5 | +0.00019 (+0.00007, +0.00032) | +0.06 (+0.04, +0.08) | +0.05 (+0.01, +0.09) | **KILL** |
| H11 | Recency weights | weights | +0.00000 (-0.00012, +0.00012) | +0.02 (+0.01, +0.04) | -0.00 (-0.04, +0.04) | **KILL** |

Prior expectations, written before the run:

- H1 Contact point: Where the bat met the ball sets gear-effect spin and direction; expect direction and home-run gains.
- H2 Pitch approach and release: Approach angle sets how the swing path meets the pitch; expect a small gain on launch and distance.
- H3 Arm angle and break: Mostly redundant with pitch type and movement already in; expect nothing.
- H4 Contact quality: Physics-shaped combinations of bat tracking; dynamic loft should help spin and distance, hand-signed attack direction should help direction.
- H5 Batter swing history: A batter's typical swing denoises the single-swing measurement; expect a direction gain.
- H6 Game context: Should do nothing for a physical outcome; age may proxy for power. Likely kill.
- H7 Fielding alignment: Shifts follow batter tendencies already captured; expect nothing.
- H8 Era trend: Lets the model see ball and park drift; trees cannot extrapolate, so a screening gain may not survive confirmation.
- H9 Park-year: Fence and ball changes by season at each park; expect a small Oracle Park gain at best.
- H10 Long history windows: More stable skill estimates than the 100-ball windows; expect a small gain.
- H11 Recency weights: Recent seasons count more (ball, tracking and park shifts); expect a small gain.
