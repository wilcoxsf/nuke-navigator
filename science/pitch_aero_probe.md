# Pitch as an aerodynamic probe (22 Oct 2026), 40000 balls with bat tracking
  pitch ax: sd 10.90 ft/s2, explained by release and spin 94.4% (out of fold), residual sd 2.576
  pitch ay: sd 4.19 ft/s2, explained by release and spin 73.5% (out of fold), residual sd 2.155
  pitch az: sd 8.44 ft/s2, explained by release and spin 91.7% (out of fold), residual sd 2.436

## Carry model R squared (out of fold by game)
  baseline (contact, weather, pitch, swing)                       0.3839
  + pitch acceleration residuals                                 0.3804   (gain -0.0035)
  + residuals centered within pitcher and pitch type             0.3770   (gain -0.0069)

## Correlation of each residual with the carry model's own error (what the baseline cannot explain)
  res_ax   r = -0.0010
  res_ay   r = +0.0285
  res_az   r = +0.0024
  resc_ax  r = -0.0005
  resc_ay  r = +0.0306
  resc_az  r = +0.0049

reading: kill rule is a gain under 0.005; a residual correlation near zero means the pitch's unexplained acceleration says nothing about the batted ball's carry.
