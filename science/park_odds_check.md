# Per-park wall odds, fit 2023-2024, scored 2025-2026
- balls scored: 30,920 at 31 park-venues; home runs 22.5%
## All parks (lower Brier is better; hard call = the physics at clearance 0)
- hard call: wrong 3.2%
- p_pool: Brier 0.0250; wrong 3.2%
- p_park0.05: Brier 0.0232; wrong 2.9%
- p_park0.3: Brier 0.0225; wrong 2.9%
- p_park3.0: Brier 0.0224; wrong 2.8%
- p_park3.0 minus pooled: -0.0026 (95% -0.0032 to -0.0021, games resampled)
## By park, 2025-2026 (p_park3.0 against pooled; where the hard call misses most)
- BAL@2: 1,057 balls; hard call wrong 8.1%; pooled Brier 0.0727, own odds Brier 0.0759 (wrong 8.4%)
- TB@12: 552 balls; hard call wrong 7.6%; pooled Brier 0.0531, own odds Brier 0.0317 (wrong 4.2%)
- TB@2523: 486 balls; hard call wrong 7.2%; pooled Brier 0.0650, own odds Brier 0.0635 (wrong 8.2%)
- KC@7: 941 balls; hard call wrong 5.8%; pooled Brier 0.0539, own odds Brier 0.0308 (wrong 4.0%)
- ATH@2529: 1,122 balls; hard call wrong 5.3%; pooled Brier 0.0400, own odds Brier 0.0404 (wrong 5.2%)
- SF@2395: 912 balls; hard call wrong 4.6%; pooled Brier 0.0413, own odds Brier 0.0230 (wrong 3.2%)
- PIT@31: 957 balls; hard call wrong 4.1%; pooled Brier 0.0277, own odds Brier 0.0233 (wrong 2.9%)
- COL@19: 1,142 balls; hard call wrong 3.9%; pooled Brier 0.0271, own odds Brier 0.0259 (wrong 3.3%)
- TOR@14: 1,038 balls; hard call wrong 3.7%; pooled Brier 0.0268, own odds Brier 0.0248 (wrong 3.4%)
- WSH@3309: 1,105 balls; hard call wrong 3.5%; pooled Brier 0.0254, own odds Brier 0.0233 (wrong 3.4%)
- CLE@5: 1,035 balls; hard call wrong 3.4%; pooled Brier 0.0196, own odds Brier 0.0206 (wrong 2.7%)
- TEX@5325: 1,019 balls; hard call wrong 3.2%; pooled Brier 0.0237, own odds Brier 0.0241 (wrong 2.7%)
- Oracle with the Oracle-only odds the app uses today (logistic(0.575 x clear + 1.585)): Brier 0.0233  (in-sample for 2025-2026: it was fit on all four seasons)
