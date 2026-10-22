# Bake-off scoreboard (predict mode, legal features only)

Test: games from 2025-06-01 on (204,034 batted balls, 9,342 home runs, 3,990 games; 7,068 balls at Oracle Park). Train before 2025-03-01, early stopping and the stack fitted on 2025-03-01 to 2025-05-31. Differences are against `cat` with a 95% interval from 300 resamples of whole games; an interval that excludes zero is a real difference.

| Entrant | HR Brier | vs ref (95% CI) | Near-wall Brier | Oracle Park Brier | vs ref at Oracle Park | AUC | Calibration error | Fly-ball distance MAE (ft) |
|---|---|---|---|---|---|---|---|---|
| stack | 0.01317 | -0.00032 (-0.00041, -0.00022) | 0.0858 | 0.01208 | +0.00037 (-0.00010, +0.00082) | 0.9930 | 0.00256 | 11.34 |
| xgb | 0.01333 | -0.00016 (-0.00026, -0.00008) | 0.0863 | 0.01137 | -0.00035 (-0.00074, +0.00008) | 0.9928 | 0.00178 | 11.40 |
| lgbm_phys | 0.01337 | -0.00012 (-0.00020, -0.00004) | 0.0866 | 0.01175 | +0.00004 (-0.00038, +0.00045) | 0.9928 | 0.00160 | 11.46 (11.40 as physics + correction) |
| cat | 0.01349 | +0.00000 (+0.00000, +0.00000) | 0.0875 | 0.01169 | +0.00000 (+0.00000, +0.00000) | 0.9925 | 0.00183 | 11.50 |
| diffphys_v3b | 0.01378 | +0.00029 (+0.00015, +0.00043) | 0.0895 | 0.01224 | +0.00054 (-0.00011, +0.00125) | 0.9923 | 0.00097 | 11.38 |

Stack weights on entrant logits (fitted on validation): cat 0.174, diffphys_v3b 0.448, lgbm_phys 0.211, xgb 0.22
