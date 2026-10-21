# College-to-MLB transfer test

MLB fly balls (launch angle 15-45, exit speed 90+ mph, with projected distance): train 69,673 (through 2017), test 51,450 (2018 on). Target: Statcast projected distance. Balls need a landing bearing and a park azimuth; heading is the landing bearing.

| Model | MAE (ft) | Mean error (ft) |
|---|---|---|
| Physics (college fit, college spin teacher), air density and wind (scale 0.0) | 16.5 | +4.0 |
| Same physics, air density, calm | 16.5 | +4.0 |
| Same physics, standard air, calm | 17.4 | +0.8 |
| Physics with one MLB scale factor (1.005) | 16.6 | +5.8 |
| Boosted trees: contact + bearing | 12.8 | +2.7 |
| Boosted trees: contact + bearing + weather and field-frame wind | 12.2 | +2.8 |
| Physics + boosted-tree correction (contact + bearing + weather and wind) | 12.1 | +2.8 |

Wind diagnostic (training years):

- wind_along: corr with miss +0.035, slope +0.31 ft per m/s
- wind_cross: corr with miss +0.008, slope +0.07 ft per m/s
- om_wind_mph: corr with miss +0.017, slope +0.11 ft per m/s
- Mean miss of the calm physics (MLB minus physics): tailwind over 3 m/s -0.4 ft (11,309 balls), headwind over 3 m/s -2.9 ft (5,877 balls)
