# Feature sweep: confirmation on the held-out test

Train: every game before 2025-06-01 (1,205,945 balls). Test: 2025-06-01 on (204,034 balls, 9,342 home runs). Final set: ['H1', 'H4', 'H16']. Features added: 14. Differences are final minus baseline (negative is better), 99% interval over games.

| Metric | Baseline | Final set | Difference (99% interval) |
|---|---|---|---|
| HR Brier | 0.01403 | 0.01375 | -0.00027 (-0.00043, -0.00012) |
| Bearing MAE (deg) | 11.02 | 10.14 | -0.88 (-0.91, -0.85) |
| Fly-ball distance MAE (ft) | 11.84 | 11.63 | -0.22 (-0.26, -0.17) |
| HR Brier, near the wall | 0.0911 | 0.0893 | -0.00185 |
| HR Brier, Oracle Park | 0.01245 | 0.01231 | -0.00013 |
| HR Brier, ATH home games (7,168 balls) | 0.01800 | 0.01638 | -0.00162 |
| HR Brier, DET home games (6,771 balls) | 0.01813 | 0.01805 | -0.00008 |
| HR Brier, LAA home games (6,737 balls) | 0.01199 | 0.01214 | +0.00015 |
| HR Brier, CIN home games (6,438 balls) | 0.01624 | 0.01569 | -0.00056 |
| HR Brier, COL home games (7,505 balls) | 0.01494 | 0.01444 | -0.00050 |
| HR Brier, Jun-Dec 2025 | 0.01420 | 0.01391 | -0.00030 |
| HR Brier, 2026 | 0.01391 | 0.01365 | -0.00026 |
