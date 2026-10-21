# Bake-off scoreboard (predict mode, legal features only)

Test: games from 2025-06-01 on (204,034 batted balls, 9,342 home runs, 3,990 games; 7,068 balls at Oracle Park). Train before 2025-03-01, early stopping and the stack fitted on 2025-03-01 to 2025-05-31. Differences are against `lgbm` with a 95% interval from 400 resamples of whole games; an interval that excludes zero is a real difference.

| Entrant | HR Brier | vs ref (95% CI) | Near-wall Brier | Oracle Park Brier | vs ref at Oracle Park | AUC | Calibration error | Fly-ball distance MAE (ft) |
|---|---|---|---|---|---|---|---|---|
| stack | 0.01333 | -0.00021 (-0.00031, -0.00013) | 0.0867 | 0.01194 | +0.00013 (-0.00036, +0.00058) | 0.9930 | 0.00261 | 11.58 |
| xgb | 0.01342 | -0.00012 (-0.00022, -0.00001) | 0.0870 | 0.01121 | -0.00060 (-0.00113, -0.00011) | 0.9927 | 0.00183 | 11.52 |
| lgbm_phys | 0.01349 | -0.00005 (-0.00016, +0.00006) | 0.0876 | 0.01141 | -0.00040 (-0.00089, +0.00005) | 0.9927 | 0.00181 | 11.55 (11.55 as physics + correction) |
| lgbm | 0.01355 | +0.00000 (+0.00000, +0.00000) | 0.0879 | 0.01181 | +0.00000 (+0.00000, +0.00000) | 0.9927 | 0.00113 | 11.84 |
| mlp | 0.01367 | +0.00012 (-0.00001, +0.00025) | 0.0884 | 0.01190 | +0.00009 (-0.00058, +0.00073) | 0.9925 | 0.00112 | 12.32 |
| logit | 0.01960 | +0.00605 (+0.00579, +0.00631) | 0.1278 | 0.01681 | +0.00502 (+0.00371, +0.00630) | 0.9843 | 0.00682 | 42.36 |

Stack weights on entrant logits (fitted on validation): lgbm 0.213, lgbm_phys 0.186, logit -0.008, mlp 0.385, xgb 0.192
