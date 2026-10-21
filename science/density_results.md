# B3: landing-density model

Mixture of 4 correlated Gaussians over (distance, bearing), centered on physics distance and the direction estimate, trained on 529,759 balls that can leave the park, scored on 98,417 test balls (2025-06-01 on).

| Measure | Single Gaussian (same centers) | Landing-density model |
|---|---|---|
| Mean negative log-likelihood of the true landing spot | 8.755 | 7.607 |
| Distance inside the central 50% / 90% (ideal 0.50 / 0.90) | | 0.465 / 0.897 |
| Bearing inside the central 50% / 90% (ideal 0.50 / 0.90) | | 0.498 / 0.913 |

Home-run probability from the cloud (wall allowance 10 ft fitted on validation; fence = five-point park profile):

| Model | HR Brier (all test balls) | Region-only subset | Near the wall | Oracle Park |
|---|---|---|---|---|
| XGBoost classifier (same balls) | 0.01336 | | 0.0870 | 0.0240 |
| Cloud-derived | 0.01521 | | 0.0958 | 0.0297 |
