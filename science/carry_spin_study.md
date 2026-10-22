# Carry and spin study (22 Oct 2026)

## A. Side spin needed so real balls land where they landed (2156 balls, Giants batting since 2023-07-14)
total side spin (rpm) = -6 + -20 x hand + -1.2 x direction + -0.4 x hand x direction  (hand +1 right, -1 left; direction degrees, + toward right field)
the page's prior is  0 - 849 x hand - 94 x direction;  residual sd of the new fit 76 rpm vs 1957 rpm of the old prior around the same balls
  pulled (right-handers left of CF, left-handers right of CF) beyond 15 deg: n 857, mean total side spin 0 rpm, prior would say 205
  opposite field beyond 15 deg: n 331, mean total side spin -38 rpm, prior would say -837
  center within 10 deg: n 665, mean total side spin 0 rpm, prior would say -103
share of balls where |dws| > 1500 rpm: 0.52

## B. How predictable is the carry multiplier (20,000 balls with bat tracking)
log(carry): mean -0.016, sd 0.320 (so carry typically varies by about 32% around its mean)
R squared of log(carry) from everything measured: 0.395 (out of fold, grouped by game)
  contact only (exit speed, angle, bearing, hand)                        R2 0.256
  + weather (temp, humidity, pressure, wind)                             R2 0.253   (gain -0.003)
  + pitch (speed, spin, axis, break, location, approach angle)           R2 0.278   (gain +0.025)
  + swing (bat speed, attack angle, tilt, length, launch minus attack)   R2 0.395   (gain +0.117)
top features by gain: launch_angle 25%, gap 21%, attack_angle 11%, swing_path_tilt 9%, plate_z 5%, launch_speed 5%, swing_length 4%, bearing 3%

reading: the unexplained share (1 - R2) is the hidden carry (wind variation inside a game, true batted-ball spin, the ball itself); a what-if band should use that spread, not a fixed one.
