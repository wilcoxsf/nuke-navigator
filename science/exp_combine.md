# Feature sweep: combine and ablate

Survivors going in: KEEP ['H1', 'H4'], MAYBE ['H2'].

| Set | HR Brier diff vs baseline | Bearing MAE diff (deg) | Distance MAE diff (ft) |
|---|---|---|---|
| all survivors | -0.00020 (-0.00036, -0.00006) | -0.54 (-0.56, -0.51) | -0.21 (-0.26, -0.16) |

Drop one group at a time (positive means that group was helping; interval spanning zero means it adds nothing):

| Dropped | HR Brier diff vs all | Bearing MAE diff (deg) | Distance MAE diff (ft) | Verdict |
|---|---|---|---|---|
| H1 Contact point | +0.00012 (-0.00001, +0.00025) | +0.22 (+0.20, +0.23) | +0.09 (+0.05, +0.14) | stays |
| H4 Contact quality | +0.00012 (-0.00003, +0.00027) | +0.31 (+0.29, +0.33) | +0.08 (+0.04, +0.12) | stays |
| H2 Pitch approach and release | +0.00005 (-0.00008, +0.00019) | -0.02 (-0.04, -0.01) | +0.06 (+0.02, +0.11) | redundant, out |

Final set for confirmation: ['H1', 'H4']
