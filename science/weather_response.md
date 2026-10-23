# Does the physics respond to weather like real balls do? (22 Oct 2026), 40000 balls with a carry label (sidespin prior -864 / -75)
weather ranges: temperature 27 to 113 F (middle 90%: 53 to 92), elevation 0 to 5190 ft, humidity 3 to 100%
rows with every input present: 39994 of 40000

## Linear model of log carry (game-clustered standard errors); J = -116 ft per unit log carry, so 0.01 in log carry is about -1.2 ft
  temp_10F            +0.0061   (se 0.0014)   -> -0.7 ft per unit   t = +4.3
  elev_1000ft         +0.0119   (se 0.0015)   -> -1.4 ft per unit   t = +8.0
  rh_10pct            +0.0010   (se 0.0009)   -> -0.1 ft per unit   t = +1.1
  wind_along_mph      -0.0006   (se 0.0003)   -> +0.1 ft per unit   t = -2.0
  wind_cross_mph      -0.0008   (se 0.0003)   -> +0.1 ft per unit   t = -2.7

Reading the weather terms (a negative feet figure = real balls travel LESS than the physics says as that variable rises; carry is a density multiplier and J is negative):
  temperature: -0.7 ft per +10 F beyond what the physics already gives (the physics itself gives about +3 ft per +10 F at 100 mph, 28 degrees)
  elevation: -1.4 ft per +1000 ft beyond the physics (Coors at 5,200 ft: -7.2 ft)
  wind along the ball's path: +0.1 ft per mph of tailwind, beyond the physics' calm-air carry (the sandbox's wind term is separate and is not in this regression's physics)

## Flexible check: LightGBM partial effect of temperature on log carry, other inputs at their own values
  temperature 45 F: mean predicted log carry +0.0169  (+0.0 ft vs 65 F)
  temperature 55 F: mean predicted log carry +0.0187  (+0.0 ft vs 65 F)
  temperature 65 F: mean predicted log carry +0.0198  (+0.0 ft vs 65 F)
  temperature 75 F: mean predicted log carry +0.0243  (+0.0 ft vs 65 F)
  temperature 85 F: mean predicted log carry +0.0266  (+0.0 ft vs 65 F)
  temperature 95 F: mean predicted log carry +0.0341  (+0.0 ft vs 65 F)
  (relative to 65 F, in feet at the median sensitivity)
    45 F: +0.3 ft
    55 F: +0.1 ft
    75 F: -0.5 ft
    85 F: -0.8 ft
    95 F: -1.7 ft

## Flexible check: elevation
       0 ft: -0.0 ft vs sea level
     500 ft: -1.3 ft vs sea level
    1000 ft: +0.0 ft vs sea level
    5200 ft: -6.4 ft vs sea level
