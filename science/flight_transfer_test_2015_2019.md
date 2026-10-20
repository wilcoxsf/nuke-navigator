# College-to-MLB transfer test

MLB fly balls (launch angle 15-45, exit speed 90+ mph, with projected distance): train 72,875 (through 2017), test 53,434 (2018 on). Target: Statcast projected distance. Wind is not in the physics.

| Model | MAE (ft) | Mean error (ft) |
|---|---|---|
| Physics (college fit, college spin teacher), air density from weather | 16.5 | +4.0 |
| Same physics, standard air everywhere | 17.4 | +0.8 |
| Physics with one MLB scale factor (1.005) | 16.6 | +5.8 |
| Boosted trees: contact only | 16.4 | +3.1 |
| Boosted trees: contact + weather | 15.9 | +3.1 |
| Physics + boosted-tree correction (contact + weather) | 15.7 | +3.0 |
