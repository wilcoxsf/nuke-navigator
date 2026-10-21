# T3: structural home-run probability

Fitted on the validation slice: wall allowance 9.9 ft, distance spread 14.6 ft, direction spread 10.2 degrees. Test: games from 2025-06-01 on.

| Model | Brier (all test balls) | Near the wall |
|---|---|---|
| XGBoost classifier | 0.01342 | 0.0870 |
| Structural (distance x direction x fence) | 0.01491 | 0.0968 |

Scoreboard with the structural entrant added (stack fitted on validation, difference against LightGBM with a 95% interval over games):

| Entrant | HR Brier | vs LightGBM | Near-wall | Oracle Park | vs ref at Oracle | AUC | Calibration error | Fly-ball distance MAE |
|---|---|---|---|---|---|---|---|---|
| stack | 0.01332 | -0.00022 (-0.00034, -0.00013) | 0.0868 | 0.01203 | +0.00022 (-0.00038, +0.00075) | 0.9930 | 0.00248 | 11.44 |
| xgb | 0.01342 | -0.00012 (-0.00022, -0.00001) | 0.0870 | 0.01121 | -0.00060 (-0.00113, -0.00011) | 0.9927 | 0.00183 | 11.52 |
| structural | 0.01491 | +0.00137 (+0.00117, +0.00156) | 0.0968 | 0.01409 | +0.00227 (+0.00125, +0.00329) | 0.9906 | 0.00257 | 11.52 |
