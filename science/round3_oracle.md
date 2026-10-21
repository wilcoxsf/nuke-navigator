# Oracle Park calibration layer

Fit on 12,880 Oracle home-game balls before 2025-06-01 whose predicted distance is 300-460 ft; scored on 7,068 Oracle home-game balls from 2025-06-01 on (970 near the wall, 136 games). Inputs: the general model's logit, estimated direction (5 bins), launch angle (6 bins).

| Version | Brier, all Oracle test balls | Near the wall |
|---|---|---|
| General model | 0.01281 | 0.0911 |
| With the Oracle layer | 0.01259 | 0.0893 |

Difference in Brier, all Oracle test balls: -0.00022 (95% interval over games -0.00047 to +0.00006). Negative means the layer helps.
