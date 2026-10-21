# T2: direction model lab

Near-wall = projected distance 330-430 ft with a known landing bearing. Validation 6,496 balls, test 30,541 balls. Errors are in degrees of landing bearing. Difference is against C0 on the test slice, 95% interval over games (negative is better).

| Configuration | Val near-wall MAE | Test near-wall MAE | Test median | Test 90th pct | Change vs C0 (95% interval) | Test fly-ball MAE |
|---|---|---|---|---|---|---|
| C0 current (all balls) | 7.174 | 7.059 | 5.75 | 14.5 | +0.000 (+0.000, +0.000) | 7.037 |
| C1 region balls only | 7.051 | 6.963 | 5.65 | 14.3 | -0.096 (-0.134, -0.057) | 6.920 |
| C2 + approach, plate, attack-direction trig | 6.999 | 6.931 | 5.61 | 14.3 | -0.129 (-0.169, -0.087) | 6.892 |
| C3 larger, slower, early-stopped | 6.846 | 6.762 | 5.46 | 13.9 | -0.297 (-0.335, -0.258) | 6.710 |
| C4 XGBoost | 6.967 | 6.864 | 5.58 | 14.1 | -0.196 (-0.232, -0.152) | 6.850 |
| C5 average of C3 and C4 | 6.803 | 6.711 | 5.43 | 13.8 | -0.349 (-0.384, -0.309) | 6.671 |

Best on validation: C5 average of C3 and C4.
