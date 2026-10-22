# Carry band study (22 Oct 2026), 20,000 balls with bat tracking since 2023-07-14

## B. Distance error when the physics uses a predicted carry (feet, mean absolute error against Statcast's projected distance)
  carry fixed at 1 (the page's prior)                      MAE 14.7 ft, bias -1.1 ft
  carry predicted from contact only                         MAE 12.4 ft, bias +1.8 ft
  carry predicted from contact + weather + pitch            MAE 12.2 ft, bias +1.8 ft
  carry predicted from everything including bat tracking    MAE 11.3 ft, bias +1.5 ft
  (the floor, carry known exactly, is 0 by construction)

## C. What-if band: quantiles of log carry from exit speed, launch angle, bearing, hand and temperature only
  80% interval coverage out of fold: 0.772 (target 0.80); below the band 0.112, above 0.115
  median interval width in log carry: 0.255 (about 26% of air density)
  a typical home-run swing (104 mph, 28 deg, 15 deg right): 223 real balls; distance at the 10%, 50%, 90% carry: 414, 398, 382 ft (real balls: median 399 ft, 10-90% 377 to 420)
  a near-wall swing (98 mph, 27 deg, 15 deg right): 271 real balls; distance at the 10%, 50%, 90% carry: 381, 369, 354 ft (real balls: median 369 ft, 10-90% 348 to 391)

reading: B shows what bat tracking buys in distance accuracy; C shows whether a Goner Grid band built on carry alone is honest (coverage near 80%) and how wide it is in feet.
