# Bake-off scoreboard (predict mode, legal features only)

Test: games from 2025-06-01 on (204,034 batted balls, 9,342 home runs, 3,990 games; 7,068 balls at Oracle Park). Train before 2025-03-01, early stopping and the stack fitted on 2025-03-01 to 2025-05-31. Differences are against `lgbm` with a 95% interval from 400 resamples of whole games; an interval that excludes zero is a real difference.

| Entrant | HR Brier | vs ref (95% CI) | Near-wall Brier | Oracle Park Brier | vs ref at Oracle Park | AUC | Calibration error | Fly-ball distance MAE (ft) |
|---|---|---|---|---|---|---|---|---|
| stack | 0.01054 | -0.00007 (-0.00014, +0.00000) | 0.0678 | 0.00973 | +0.00050 (+0.00013, +0.00088) | 0.9955 | 0.00220 | 10.54 |
| xgb | 0.01058 | -0.00002 (-0.00009, +0.00005) | 0.0678 | 0.00938 | +0.00016 (-0.00021, +0.00048) | 0.9954 | 0.00178 | 10.48 |
| lgbm | 0.01061 | +0.00000 (+0.00000, +0.00000) | 0.0679 | 0.00922 | +0.00000 (+0.00000, +0.00000) | 0.9954 | 0.00169 | 10.53 |

Stack weights on entrant logits (fitted on validation): lgbm 0.505, xgb 0.482
