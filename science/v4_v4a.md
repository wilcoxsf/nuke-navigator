# Bake-off scoreboard (predict mode, legal features only)

Test: games from 2025-06-01 on (204,034 batted balls, 9,342 home runs, 3,990 games; 7,068 balls at Oracle Park). Train before 2025-03-01, early stopping and the stack fitted on 2025-03-01 to 2025-05-31. Differences are against `xgb` with a 95% interval from 300 resamples of whole games; an interval that excludes zero is a real difference.

| Entrant | HR Brier | vs ref (95% CI) | Near-wall Brier | Oracle Park Brier | vs ref at Oracle Park | AUC | Calibration error | Fly-ball distance MAE (ft) |
|---|---|---|---|---|---|---|---|---|
| xgb | 0.01351 | +0.00000 (+0.00000, +0.00000) | 0.0876 | 0.01132 | +0.00000 (+0.00000, +0.00000) | 0.9926 | 0.00151 | 11.56 |
