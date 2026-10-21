# Near-wall specialist

Region: exit speed 85+ mph and launch angle 10-50 degrees (33.2% of training balls, 100.0% of training home runs). Test: 204,034 balls from 2025-06-01.

| Model | HR Brier | Near the wall | Oracle Park |
|---|---|---|---|
| General model | 0.01363 | 0.0884 | 0.01218 |
| Specialist on the 85+ mph, 10-50 degree region | 0.01363 | 0.0886 | 0.01237 |
| Average of the two in the region | 0.01351 | 0.0877 | 0.01218 |
