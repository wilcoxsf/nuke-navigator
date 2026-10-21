# T8: wood-bat spin validation (zero-fit)

Teachers are trained on the college corpus only (aluminum bats). Test sets: Cape Cod League 2,487 batted balls with complete spin and pitch data; Frontier League 2,058 batted balls with complete spin and pitch data. Domain: exit speed 60-125 mph, launch angle 10-55 degrees, spin 500-6000 rpm. Backspin and sidespin in rpm; bias is median predicted minus measured.

## Cape Cod League (2,487 balls)

| Predictor | Backspin r | Backspin R2 | Backspin MAE | Backspin bias | Sidespin r | Sidespin R2 | Sidespin MAE | Sidespin bias |
|---|---|---|---|---|---|---|---|---|
| GPT linear prior (uses direction) | 0.818 | 0.626 | 539 | +119 | 0.874 | 0.740 | 604 | +25 |
| teacher, current inputs (no direction) | 0.813 | 0.637 | 552 | +173 | 0.591 | 0.340 | 1122 | -37 |
| teacher + approach angles + plate location | 0.822 | 0.653 | 539 | +177 | 0.612 | 0.369 | 1088 | -32 |
| teacher + approach + plate + incoming pitch spin | 0.825 | 0.657 | 536 | +176 | 0.618 | 0.375 | 1080 | -19 |
| teacher WITH launch direction (like the prior) | 0.841 | 0.683 | 509 | +187 | 0.903 | 0.814 | 503 | +25 |

## Frontier League (2,058 balls)

| Predictor | Backspin r | Backspin R2 | Backspin MAE | Backspin bias | Sidespin r | Sidespin R2 | Sidespin MAE | Sidespin bias |
|---|---|---|---|---|---|---|---|---|
| GPT linear prior (uses direction) | 0.868 | 0.630 | 580 | +237 | 0.887 | 0.649 | 752 | +21 |
| teacher, current inputs (no direction) | 0.863 | 0.727 | 522 | +155 | 0.547 | 0.276 | 1209 | +281 |
| teacher + approach angles + plate location | 0.871 | 0.742 | 501 | +152 | 0.601 | 0.335 | 1143 | +334 |
| teacher + approach + plate + incoming pitch spin | 0.871 | 0.744 | 498 | +147 | 0.608 | 0.341 | 1134 | +318 |
| teacher WITH launch direction (like the prior) | 0.885 | 0.767 | 466 | +157 | 0.916 | 0.835 | 487 | +62 |

## Does a simple wood-bat correction transfer between leagues?

Straight-line correction (measured = a + b x prediction) for `teacher + approach angles + plate location`, fitted on one league and applied to the other. MAE in rpm before and after.

| Fitted on | Applied to | Backspin MAE before | after | Sidespin MAE before | after |
|---|---|---|---|---|---|
| Cape Cod League | Frontier League | 501 | 483 | 1143 | 1164 |
| Frontier League | Cape Cod League | 539 | 517 | 1088 | 1117 |
