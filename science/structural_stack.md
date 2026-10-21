# Bake-off scoreboard (predict mode, legal features only)

Test: games from 2025-06-01 on (204,034 batted balls, 9,342 home runs, 3,990 games; 7,068 balls at Oracle Park). Train before 2025-03-01, early stopping and the stack fitted on 2025-03-01 to 2025-05-31. Differences are against `lgbm` with a 95% interval from 400 resamples of whole games; an interval that excludes zero is a real difference.

| Entrant | HR Brier | vs ref (95% CI) | Near-wall Brier | Oracle Park Brier | vs ref at Oracle Park | AUC | Calibration error | Fly-ball distance MAE (ft) |
|---|---|---|---|---|---|---|---|---|
| stack | 0.01332 | -0.00022 (-0.00034, -0.00013) | 0.0868 | 0.01203 | +0.00022 (-0.00038, +0.00075) | 0.9930 | 0.00248 | 11.44 |
| xgb | 0.01342 | -0.00012 (-0.00022, -0.00001) | 0.0870 | 0.01121 | -0.00060 (-0.00113, -0.00011) | 0.9927 | 0.00183 | 11.52 |
| lgbm_phys | 0.01349 | -0.00005 (-0.00016, +0.00006) | 0.0876 | 0.01141 | -0.00040 (-0.00089, +0.00005) | 0.9927 | 0.00181 | 11.55 (11.55 as physics + correction) |
| lgbm | 0.01355 | +0.00000 (+0.00000, +0.00000) | 0.0879 | 0.01181 | +0.00000 (+0.00000, +0.00000) | 0.9927 | 0.00113 | 11.84 |
| cat | 0.01360 | +0.00005 (-0.00007, +0.00018) | 0.0883 | 0.01151 | -0.00029 (-0.00088, +0.00025) | 0.9924 | 0.00174 | 11.60 |
| mlp | 0.01367 | +0.00012 (-0.00001, +0.00025) | 0.0884 | 0.01190 | +0.00009 (-0.00058, +0.00073) | 0.9925 | 0.00112 | 12.32 |
| diffphys | 0.01392 | +0.00037 (+0.00019, +0.00052) | 0.0905 | 0.01215 | +0.00035 (-0.00048, +0.00121) | 0.9922 | 0.00117 | 11.39 |
| structural | 0.01491 | +0.00137 (+0.00117, +0.00156) | 0.0968 | 0.01409 | +0.00227 (+0.00125, +0.00329) | 0.9906 | 0.00257 | 11.52 |
| logit | 0.01960 | +0.00605 (+0.00579, +0.00631) | 0.1278 | 0.01681 | +0.00502 (+0.00371, +0.00630) | 0.9843 | 0.00682 | 42.36 |

Stack weights on entrant logits (fitted on validation): cat 0.375, diffphys 0.357, lgbm 0.161, lgbm_phys 0.002, logit -0.041, mlp 0.198, structural -0.1, xgb 0.057
