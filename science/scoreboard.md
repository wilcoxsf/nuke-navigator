# Arena scoreboard (smoke run)

Generated 2026-10-20 22:05 UTC. Inputs: contact-legal features only, enforced by `features.py`.
Rows: train 412,582 (2020-2023), validation 123,824 (2024), test 217,592 (2025+).
Caveat: this dataset has no launch direction, pitch type, speed, spin or location, and the bat-tracking columns it does have are not used yet, so this is a pipeline check, not a verdict. HR rates here cover all batted balls (about 4.5% are home runs), so these numbers are not comparable to the old four-park 0.06 figures.

## Home run probability (test)

| Model | Brier | Log loss | AUC |
|---|---|---|---|
| HR constant (league rate) | 0.04323 | 0.18439 | 0.5000 |
| HR logistic (EV, LA, hand) | 0.01951 | 0.06322 | 0.9844 |
| HR boosted trees | 0.01901 | 0.06057 | 0.9858 |

Near-wall slice (projected distance 330-430 ft, n=32,518) for boosted trees: Brier 0.1247, log loss 0.3886, AUC 0.8743

## Projected distance (test, balls with a projected distance)

| Model | MAE (ft) |
|---|---|
| Constant (train mean) | 121.2 |
| Boosted trees, no temperature | 10.1 |
| Boosted trees, with game temperature | 9.9 |

Rows with a projected distance in test: 217,000
