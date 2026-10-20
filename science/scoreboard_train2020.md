# Arena scoreboard: train from 2020

Generated 2026-10-20 22:57 UTC. Contact-legal features only, enforced by `features.py`.
Rows: train 412,582 (2020-2023), validation 123,824 (2024), test 217,592 (2025+).
No launch direction, pitch information or bat tracking is used yet, so this is a baseline, not a verdict. HR rates cover all batted balls (about 4.5% are home runs), so these are not comparable to the old four-park 0.06 figures.

## Home run probability (test)

| Model | Brier | Log loss | AUC |
|---|---|---|---|
| HR constant (league rate) | 0.04323 | 0.18439 | 0.5000 |
| HR logistic (EV, LA, hand) | 0.01951 | 0.06322 | 0.9844 |
| HR boosted trees | 0.01901 | 0.06056 | 0.9858 |

Near-wall slice (projected distance 330-430 ft, n=32,518) for boosted trees: Brier 0.1246, log loss 0.3885, AUC 0.8742

## Projected distance (test)

| Model | MAE (ft) |
|---|---|
| Constant (train mean) | 121.2 |
| Boosted trees | 9.9 |
| Boosted trees, fly balls only (LA 15-45, EV 90+), n=49,774 | 15.5 |
