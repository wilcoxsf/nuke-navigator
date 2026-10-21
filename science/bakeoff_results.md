# Bake-off scoreboard (predict mode, legal features only)

Test: games from 2025-06-01 on (204,034 batted balls, 9,342 home runs, 3,990 games; 7,068 balls at Oracle Park). Train before 2025-03-01, early stopping and the stack fitted on 2025-03-01 to 2025-05-31. Differences are against `lgbm` with a 95% interval from 400 resamples of whole games; an interval that excludes zero is a real difference.

| Entrant | HR Brier | vs ref (95% CI) | Near-wall Brier | Oracle Park Brier | vs ref at Oracle Park | AUC | Calibration error | Fly-ball distance MAE (ft) |
|---|---|---|---|---|---|---|---|---|
| stack | 0.01365 | -0.00012 (-0.00020, -0.00003) | 0.0887 | 0.01231 | +0.00027 (-0.00016, +0.00068) | 0.9926 | 0.00276 | 11.71 |
| xgb | 0.01368 | -0.00008 (-0.00017, +0.00003) | 0.0888 | 0.01163 | -0.00040 (-0.00089, +0.00010) | 0.9924 | 0.00154 | 11.66 |
| lgbm_phys | 0.01374 | -0.00002 (-0.00012, +0.00009) | 0.0891 | 0.01173 | -0.00031 (-0.00079, +0.00015) | 0.9924 | 0.00146 | 11.70 (11.70 as physics + correction) |
| lgbm | 0.01376 | +0.00000 (+0.00000, +0.00000) | 0.0893 | 0.01203 | +0.00000 (+0.00000, +0.00000) | 0.9924 | 0.00118 | 11.93 |
| mlp | 0.01412 | +0.00035 (+0.00024, +0.00048) | 0.0914 | 0.01217 | +0.00014 (-0.00040, +0.00073) | 0.9920 | 0.00080 | 12.64 |
| logit | 0.01960 | +0.00583 (+0.00558, +0.00611) | 0.1278 | 0.01681 | +0.00479 (+0.00346, +0.00607) | 0.9843 | 0.00683 | 42.37 |

Stack weights on entrant logits (fitted on validation): lgbm 0.242, lgbm_phys 0.43, logit -0.045, mlp 0.334, xgb 0.021
