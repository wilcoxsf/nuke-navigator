# Feature sweep: confirmation on the held-out test

Train: every game before 2025-06-01 (1,205,945 balls). Test: 2025-06-01 on (204,034 balls, 9,342 home runs). Final set: ['H1', 'H4']. Features added: 11. Differences are final minus baseline (negative is better), 99% interval over games.

| Metric | Baseline | Final set | Difference (99% interval) |
|---|---|---|---|
| HR Brier | 0.01403 | 0.01363 | -0.00040 (-0.00053, -0.00028) |
| Bearing MAE (deg) | 11.02 | 10.19 | -0.82 (-0.85, -0.79) |
| Fly-ball distance MAE (ft) | 11.84 | 11.64 | -0.20 (-0.25, -0.16) |
| HR Brier, near the wall | 0.0911 | 0.0884 | -0.00274 |
| HR Brier, Oracle Park | 0.01245 | 0.01218 | -0.00026 |
| HR Brier, Jun-Dec 2025 | 0.01420 | 0.01383 | -0.00037 |
| HR Brier, 2026 | 0.01391 | 0.01350 | -0.00042 |
