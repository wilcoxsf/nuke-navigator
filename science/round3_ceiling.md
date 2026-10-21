# Ceiling diagnostic

Train: every game before 2025-06-01. Test: 2025-06-01 on (204,034 balls). HR Brier, lower is better. The two leaky rows use information a prediction cannot have; they bound what better direction and distance estimates could buy.

| Model | HR Brier | Near the wall (330-430 ft) | Oracle Park | Brier change vs the legal model |
|---|---|---|---|---|
| Legal features (round-2 set) | 0.01363 | 0.0884 | 0.01218 |  |
| + true landing bearing (leaky) | 0.01046 | 0.0672 | 0.00989 | -23.2% |
| + true bearing and projected distance (leaky) | 0.00306 | 0.0196 | 0.00301 | -77.6% |
