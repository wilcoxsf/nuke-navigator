# Carry audit (22 Oct 2026), 12000 hard-hit fly balls from 2025 (95+ mph, 20 to 40 deg)

## A. Selection bias: error (simulated minus projected distance, feet) by predicted margin over the fence
overall: mean error -3.8 ft (all), -12.6 ft (home runs, n 4061), 0.7 ft (non-home-runs); home-run share 0.338
predicted margin      n  HR rate    all balls    home runs      non-HRs
-120 to -50 ft    417    0.000         -1.6         +nan         -1.6
-50 to -30 ft    1577    0.006         -2.3        -32.0         -2.1
-30 to -15 ft    2339    0.029         -2.5        -26.8         -1.8
-15 to -5 ft     1634    0.128         -3.7        -22.2         -1.0
-5 to 5 ft       1604    0.299         -3.5        -17.7         +2.6
5 to 15 ft       1392    0.524         -3.7        -13.8         +7.3
15 to 30 ft      1431    0.745         -5.2        -11.4        +13.0
30 to 50 ft      1140    0.913         -6.2         -9.1        +24.1
50 to 120 ft      466    0.983         -8.7         -9.4        +29.1
reading: if 'all balls' stays near 0 in every bin while home runs read positive-error and non-home-runs negative, the 13 ft gap is selection, not a biased spin prior.

## B. Carry inversion
log carry: mean -0.025, sd 0.111; carry multiplier 5th/50th/95th percentile 0.83 / 0.97 / 1.17
roots at the search bounds (carry under 0.25 or over 1.7): 0.07%
sensitivity J = dD/dlog(carry), feet per unit: 5th 93, median 159, 95th 215; share with |J| under 30: 0.00
sd of log carry where |J| is below the median: 0.132; above the median: 0.084 (a larger spread where distance is less sensitive means noisier carry labels)
  launch angle 20 to 26 deg: median |J| 131 ft per unit log carry, sd of log carry 0.147, mean log carry -0.016
  launch angle 26 to 30 deg: median |J| 159 ft per unit log carry, sd of log carry 0.083, mean log carry -0.034
  launch angle 30 to 34 deg: median |J| 175 ft per unit log carry, sd of log carry 0.080, mean log carry -0.032
  launch angle 34 to 40 deg: median |J| 185 ft per unit log carry, sd of log carry 0.080, mean log carry -0.024

note: a 5 ft distance error moves log carry by about 5 / median|J| = 0.031, compared with the observed spread 0.111.
