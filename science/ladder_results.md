# Information ladder

Generated 2026-10-21 05:24 UTC. Train 2015-2023 (1,037,616 rows), validation 2024, test 2025+ (248,537 rows). Test years all have Hawk-Eye tracking.

Brier lower is better. 'Near wall' = projected distance 330-430 ft. 'SF home' = games at Oracle Park.

| Rung | Features | HR Brier | Δ vs L0 | Near-wall Brier | SF-home Brier | AUC | Fly-ball distance MAE |
|---|---|---|---|---|---|---|---|
| L0 contact | 5 | 0.01919 | +0.00000 (+0.0%) | 0.1260 | 0.01538 | 0.9856 | 15.7 ft |
| L1 + weather | 17 | 0.01895 | -0.00024 (-1.3%) | 0.1247 | 0.01534 | 0.9860 | 15.4 ft |
| L2 + pitch | 31 | 0.01795 | -0.00125 (-6.5%) | 0.1179 | 0.01436 | 0.9873 | 14.8 ft |
| L3 + history | 39 | 0.01766 | -0.00154 (-8.0%) | 0.1160 | 0.01404 | 0.9876 | 14.6 ft |
| L4 + direction estimate | 40 | 0.01747 | -0.00172 (-9.0%) | 0.1147 | 0.01396 | 0.9879 | 14.5 ft |
| R1 LEAKY: L4 + true bearing | 41 | 0.01137 | -0.00783 (-40.8%) | 0.0729 | 0.00966 | 0.9950 | nan ft |
| R2 LEAKY: R1 + projected distance | 42 | 0.00324 | -0.01595 (-83.1%) | 0.0209 | 0.00327 | 0.9992 | nan ft |

## Launch direction estimate (legal features only)

Landing bearing MAE 18.84 degrees versus 26.27 for a constant; R2 0.343.

## Bat tracking (train 2024 to Feb 2025, validate Mar-May 2025, test Jun 2025 on)

| Setup | HR Brier | Near-wall Brier | AUC |
|---|---|---|---|
| same split, no bat tracking | 0.01781 | 0.1163 | 0.9872 |
| same split, + bat tracking | 0.01457 | 0.0946 | 0.9915 |

## What the best legal model leans on (L4 + direction estimate, share of gain %)

- launch_angle: 54.9
- launch_speed: 33.8
- home_team: 2.0
- bearing_hat: 1.8
- stand_r: 0.6
- hawkeye: 0.4
- plate_z: 0.4
- plate_x: 0.4
- air_density: 0.4
- om_temp_f: 0.4
- effective_speed: 0.3
- b_la: 0.3
- b_pull: 0.3
- om_wind_u: 0.3
- release_speed: 0.3
