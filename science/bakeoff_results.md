# Bake-off scoreboard (predict mode, legal features only)

Test: games from 2025-06-01 on (204,034 batted balls, 9,342 home runs, 3,990 games; 7,068 balls at Oracle Park). Train before 2025-03-01, early stopping and the stack fitted on 2025-03-01 to 2025-05-31. Differences are against `lgbm` with a 95% interval from 400 resamples of whole games; an interval that excludes zero is a real difference.

| Entrant | HR Brier | vs ref (95% CI) | Near-wall Brier | Oracle Park Brier | vs ref at Oracle Park | AUC | Calibration error | Fly-ball distance MAE (ft) |
|---|---|---|---|---|---|---|---|---|
| stack | 0.01356 | -0.00021 (-0.00029, -0.00012) | 0.0883 | 0.01242 | +0.00038 (-0.00008, +0.00082) | 0.9927 | 0.00265 | 11.58 |
| xgb | 0.01368 | -0.00008 (-0.00017, +0.00003) | 0.0888 | 0.01163 | -0.00040 (-0.00089, +0.00010) | 0.9924 | 0.00154 | 11.66 |
| lgbm_phys | 0.01374 | -0.00002 (-0.00012, +0.00009) | 0.0891 | 0.01173 | -0.00031 (-0.00079, +0.00015) | 0.9924 | 0.00146 | 11.70 (11.70 as physics + correction) |
| lgbm | 0.01376 | +0.00000 (+0.00000, +0.00000) | 0.0893 | 0.01203 | +0.00000 (+0.00000, +0.00000) | 0.9924 | 0.00118 | 11.93 |
| mlp | 0.01412 | +0.00035 (+0.00024, +0.00048) | 0.0914 | 0.01217 | +0.00014 (-0.00040, +0.00073) | 0.9920 | 0.00080 | 12.64 |
| diffphys | 0.01431 | +0.00055 (+0.00039, +0.00068) | 0.0932 | 0.01283 | +0.00080 (-0.00001, +0.00159) | 0.9917 | 0.00180 | 11.60 |
| logit | 0.01960 | +0.00583 (+0.00558, +0.00611) | 0.1278 | 0.01681 | +0.00479 (+0.00346, +0.00607) | 0.9843 | 0.00683 | 42.37 |

Stack weights on entrant logits (fitted on validation): diffphys 0.28, lgbm 0.207, lgbm_phys 0.362, logit -0.059, mlp 0.178, xgb 0.056
