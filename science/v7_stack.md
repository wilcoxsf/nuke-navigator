# Bake-off scoreboard (predict mode, legal features only)

Test: games from 2025-06-01 on (204,034 batted balls, 9,342 home runs, 3,990 games; 7,068 balls at Oracle Park). Train before 2025-03-01, early stopping and the stack fitted on 2025-03-01 to 2025-05-31. Differences are against `cat` with a 95% interval from 300 resamples of whole games; an interval that excludes zero is a real difference.

| Entrant | HR Brier | vs ref (95% CI) | Near-wall Brier | Oracle Park Brier | vs ref at Oracle Park | AUC | Calibration error | Fly-ball distance MAE (ft) |
|---|---|---|---|---|---|---|---|---|
| stack | 0.01320 | -0.00039 (-0.00049, -0.00029) | 0.0860 | 0.01200 | +0.00048 (+0.00010, +0.00085) | 0.9930 | 0.00244 | 11.36 |
| xgb_v5r | 0.01333 | -0.00027 (-0.00037, -0.00015) | 0.0863 | 0.01137 | -0.00016 (-0.00062, +0.00030) | 0.9928 | 0.00178 | 11.40 |
| lgbm_phys | 0.01349 | -0.00010 (-0.00018, +0.00001) | 0.0876 | 0.01141 | -0.00011 (-0.00048, +0.00032) | 0.9927 | 0.00181 | 11.55 (11.55 as physics + correction) |
| cat | 0.01360 | +0.00000 (+0.00000, +0.00000) | 0.0883 | 0.01151 | +0.00000 (+0.00000, +0.00000) | 0.9924 | 0.00174 | 11.60 |
| mlp | 0.01367 | +0.00007 (-0.00003, +0.00020) | 0.0884 | 0.01190 | +0.00039 (-0.00021, +0.00094) | 0.9925 | 0.00112 | 12.32 |
| diffphys_v3b | 0.01378 | +0.00019 (+0.00004, +0.00033) | 0.0895 | 0.01224 | +0.00073 (+0.00014, +0.00132) | 0.9923 | 0.00097 | 11.38 |

Stack weights on entrant logits (fitted on validation): cat 0.289, diffphys_v3b 0.364, lgbm_phys -0.185, mlp 0.143, xgb_v5r 0.418
