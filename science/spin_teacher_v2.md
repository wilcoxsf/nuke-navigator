# T1: spin teacher with better inputs

College balls with measured spin: 102,869. MLB fly balls (exit speed 90+, launch angle 15-45, 2023-03-01 on): 112,852.

Convention checks: plate_x vs PlateLocSide: corr with side_r -0.266 (TrackMan) and +0.128 (Statcast), sign -1; haa vs HorzApprAngle: corr with pitch_r -0.585 (TrackMan) and +0.724 (Statcast), sign -1; incoming spin axis: median gap between pitch-group medians 6 degrees; incoming spin axis used

Spin accuracy is out of fold by game file in the college data. MLB distance is the zero-fit physics model (backspin only, game air density, no wind) against Statcast projected distance.

| Teacher inputs | Backspin R2 | Sidespin R2 | Backspin MAE (rpm) | Sidespin MAE (rpm) | MLB distance MAE (ft) | Bias (ft) | Change vs current (95% interval) |
|---|---|---|---|---|---|---|---|
| V0 current (contact, pitch speed, group, hand) | 0.665 | 0.391 | 913 | 1168 | 19.25 | +13.45 |  |
| V1 + approach angles | 0.684 | 0.420 | 885 | 1132 | 19.13 | +13.21 | -0.12 (-0.13, -0.10) |
| V2 + plate location | 0.702 | 0.428 | 861 | 1121 | 19.06 | +13.31 | -0.19 (-0.20, -0.18) |
| V3 + approach angles + plate location | 0.703 | 0.450 | 860 | 1093 | 19.02 | +13.19 | -0.22 (-0.23, -0.21) |
| V4 + incoming pitch spin | 0.668 | 0.421 | 907 | 1125 | 19.18 | +13.35 | -0.07 (-0.07, -0.06) |
| V5 all three | 0.704 | 0.466 | 857 | 1069 | 19.04 | +13.22 | -0.20 (-0.22, -0.19) |
| diagnostic: + contact position (college only) | 0.719 | 0.569 | 838 | 933 |  |  |  |
