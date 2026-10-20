# Flight model fitted to college TrackMan

73,797 measured fly-ball-type batted balls (launch angle 10-55 degrees, 180-440 ft); fit on 12,000 of 59,050 training balls, scored on 14,747 held-out balls from other games.
Fitted: Cd = 0.358 + 0.176*S;  CL = 1.51*S / (1 + 3.09*S). Sidespin sign chosen: +1.

| Model | Distance MAE (ft) | Hang time MAE (s) | Curve MAE (deg) |
|---|---|---|---|
| Physics, measured spin | 13.8 | 0.16 | 2.31 |
| Physics, constant spin (no spin information) | 27.5 | 0.40 | 7.69 |
| Physics, spin predicted from contact and pitch details | 16.2 | 0.21 | 3.25 |
| Physics, spin predicted WITHOUT launch direction | 18.6 | 0.27 | 5.77 |
| Boosted trees: speed, angle, direction, hand | 16.0 | | |
| Boosted trees: + pitch details | 15.9 | | |

Notes: no weather in this corpus (sea-level air density assumed), so some error is just altitude and temperature. Direction here is the TRUE launch direction, which a Predicted MLB model does not have; the row without it shows the cost.
