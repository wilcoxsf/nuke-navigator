# Feature sweep: confirmation on the held-out test

Train: every game before 2025-06-01 (1,205,945 balls). Test: 2025-06-01 on (204,034 balls, 9,342 home runs). Final set: ['H1', 'H4', 'H13']. Features added: 13. Differences are final minus baseline (negative is better), 99% interval over games.

| Metric | Baseline | Final set | Difference (99% interval) |
|---|---|---|---|
| HR Brier | 0.01403 | 0.01373 | -0.00030 (-0.00044, -0.00014) |
| Bearing MAE (deg) | 11.02 | 10.26 | -0.76 (-0.79, -0.73) |
| Fly-ball distance MAE (ft) | 11.84 | 11.60 | -0.24 (-0.29, -0.18) |
| HR Brier, near the wall | 0.0911 | 0.0892 | -0.00191 |
| HR Brier, Oracle Park | 0.01245 | 0.01267 | +0.00022 |
| HR Brier, Jun-Dec 2025 | 0.01420 | 0.01394 | -0.00026 |
| HR Brier, 2026 | 0.01391 | 0.01359 | -0.00032 |
