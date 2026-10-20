# Information ladder

Generated 2026-10-20 23:47 UTC. Train 2015-2017 (131,712 rows), validation 2018, test 2019+ (123,857 rows). Test years all have Hawk-Eye tracking.

Brier lower is better. 'Near wall' = projected distance 330-430 ft. 'SF home' = games at Oracle Park.

| Rung | Features | HR Brier | Δ vs L0 | Near-wall Brier | SF-home Brier | AUC | Fly-ball distance MAE |
|---|---|---|---|---|---|---|---|
| L0 contact | 5 | 0.01996 | +0.00000 (+0.0%) | 0.1240 | 0.01753 | 0.9867 | 16.0 ft |
| L1 + weather | 17 | 0.01974 | -0.00023 (-1.1%) | 0.1226 | 0.01757 | 0.9869 | 15.8 ft |
| L2 + pitch | 31 | 0.01942 | -0.00054 (-2.7%) | 0.1206 | 0.01741 | 0.9876 | 15.4 ft |
| L3 + history | 39 | 0.01925 | -0.00072 (-3.6%) | 0.1194 | 0.01727 | 0.9878 | 15.3 ft |
| L4 + direction estimate | 40 | 0.01893 | -0.00103 (-5.2%) | 0.1173 | 0.01658 | 0.9880 | 15.2 ft |
| R1 LEAKY: L4 + true bearing | 41 | 0.01371 | -0.00626 (-31.3%) | 0.0832 | 0.01228 | 0.9939 | nan ft |
| R2 LEAKY: R1 + projected distance | 42 | 0.00675 | -0.01321 (-66.2%) | 0.0417 | 0.00787 | 0.9982 | nan ft |

## Launch direction estimate (legal features only)

Landing bearing MAE 19.16 degrees versus 26.00 for a constant; R2 0.308.

## Bat tracking (train 2024 to Feb 2025, validate Mar-May 2025, test Jun 2025 on)

| Setup | HR Brier | Near-wall Brier | AUC |
|---|---|---|---|

## What the best legal model leans on (L4 + direction estimate, share of gain %)

- launch_angle: 50.0
- launch_speed: 32.5
- home_team: 2.4
- bearing_hat: 2.1
- b_pull: 0.7
- plate_z: 0.7
- plate_x: 0.7
- b_hard: 0.7
- effective_speed: 0.6
- b_la: 0.6
- release_spin_rate: 0.6
- spin_axis: 0.6
- air_density: 0.5
- p_ev: 0.5
- b_ev: 0.5
