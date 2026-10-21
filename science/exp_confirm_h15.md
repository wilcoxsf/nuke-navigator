# Feature sweep: confirmation on the held-out test

Train: every game before 2025-06-01 (1,205,945 balls). Test: 2025-06-01 on (204,034 balls, 9,342 home runs). Final set: ['H1', 'H4', 'H15']. Features added: 13. Differences are final minus baseline (negative is better), 99% interval over games.

| Metric | Baseline | Final set | Difference (99% interval) |
|---|---|---|---|
| HR Brier | 0.01403 | 0.01372 | -0.00031 (-0.00045, -0.00016) |
| Bearing MAE (deg) | 11.02 | 10.29 | -0.73 (-0.76, -0.70) |
| Fly-ball distance MAE (ft) | 11.84 | 11.66 | -0.18 (-0.23, -0.13) |
| HR Brier, near the wall | 0.0911 | 0.0890 | -0.00209 |
| HR Brier, Oracle Park | 0.01245 | 0.01281 | +0.00037 |
| HR Brier, ATH home games (7,168 balls) | 0.01800 | 0.01750 | -0.00050 |
| HR Brier, DET home games (6,771 balls) | 0.01813 | 0.01802 | -0.00011 |
| HR Brier, LAA home games (6,737 balls) | 0.01199 | 0.01167 | -0.00032 |
| HR Brier, CIN home games (6,438 balls) | 0.01624 | 0.01603 | -0.00022 |
| HR Brier, COL home games (7,505 balls) | 0.01494 | 0.01443 | -0.00051 |
| HR Brier, Jun-Dec 2025 | 0.01420 | 0.01391 | -0.00029 |
| HR Brier, 2026 | 0.01391 | 0.01359 | -0.00032 |
