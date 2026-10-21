# B3: landing-density model

Mixture of 4 correlated Gaussians over (distance, bearing), centered on physics distance and the direction estimate. Trained on 529,759 balls in play and 94,622 foul balls (weight 1); scored on 98,417 test balls in play (2025-06-01 on); fence = extracted Oracle wall (bearing profile and height allowance) for Oracle Park.

| Measure (balls in play, conditional on fair) | Single Gaussian (same centers) | Landing-density model |
|---|---|---|
| Mean negative log-likelihood of the true landing spot | 8.755 | 7.594 |
| Distance inside the central 50% / 90% (ideal 0.50 / 0.90) | | 0.469 / 0.904 |
| Bearing inside the central 50% / 90% (ideal 0.50 / 0.90) | | 0.547 / 0.927 |
| Mean fair-ground probability: balls in play / test fouls | | 0.901 / 0.253 |
| Fair against foul, AUC of the cloud's fair probability (78,287 test fouls) | | 0.969 |
| Foul balls: mean negative log of (distance density x foul-ground probability) | | 4.460 |

Home-run probability from the cloud (global wall allowance 10 ft fitted on validation; calibrated = logistic on clearing probability at (0.0, 5.0, 10.0, 15.0, 20.0, 30.0) ft):

| Model | HR Brier (all test balls) | Near the wall | Oracle Park |
|---|---|---|---|
| XGBoost classifier (same balls) | 0.01336 | 0.0870 | 0.0240 |
| Cloud, one fitted allowance | 0.01554 | 0.0961 | 0.0297 |
| Cloud, calibrated | 0.01526 | 0.0970 | 0.0313 |
