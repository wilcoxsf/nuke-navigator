# The other-park view: how good, and can real landings sharpen it (seasons 2023-2026)
- contested balls (real distance within 40 ft of their own wall): 62,159 at 30 parks; home runs 13,888 (22.3%)
## Leave-one-park-out, on the contested balls (lower Brier is better; the hard calls' Brier is their error rate)
- A. distance alone: Brier 0.1200 (95% 0.1174 to 0.1228); right 88.0%
- B. the app's physics (hard call): Brier 0.0312 (95% 0.0299 to 0.0326); right 96.9%
- C. the physics as odds: Brier 0.0256 (95% 0.0246 to 0.0266); right 96.7%
- D. learned from real landings: Brier 0.0246 (95% 0.0236 to 0.0257); right 96.9%
- D minus A.: -0.0954 (95% -0.0979 to -0.0928)
- D minus B.: -0.0066 (95% -0.0074 to -0.0059)
- D minus C.: -0.0010 (95% -0.0015 to -0.0005)
## By park (D against B; balls, home-run share, error rate of B, Brier of D), the ten where the app's physics misses most
- BAL: 2,038 balls, 26% out; physics wrong 8.7% (says out but stayed in 2.6%, says in but went out 6.0%); learned Brier 0.0692
- TB: 2,057 balls, 22% out; physics wrong 6.9% (says out but stayed in 5.1%, says in but went out 1.8%); learned Brier 0.0546
- KC: 1,860 balls, 25% out; physics wrong 5.3% (says out but stayed in 0.4%, says in but went out 4.9%); learned Brier 0.0483
- SF: 1,843 balls, 22% out; physics wrong 4.9% (says out but stayed in 0.5%, says in but went out 4.4%); learned Brier 0.0405
- ATH: 2,205 balls, 23% out; physics wrong 4.9% (says out but stayed in 3.1%, says in but went out 1.7%); learned Brier 0.0470
- COL: 2,277 balls, 20% out; physics wrong 4.0% (says out but stayed in 3.7%, says in but went out 0.3%); learned Brier 0.0248
- PIT: 2,026 balls, 17% out; physics wrong 3.5% (says out but stayed in 3.0%, says in but went out 0.4%); learned Brier 0.0236
- TOR: 2,132 balls, 23% out; physics wrong 3.4% (says out but stayed in 1.0%, says in but went out 2.3%); learned Brier 0.0209
- DET: 1,726 balls, 24% out; physics wrong 3.3% (says out but stayed in 1.1%, says in but went out 2.2%); learned Brier 0.0272
- CLE: 2,112 balls, 18% out; physics wrong 3.3% (says out but stayed in 2.5%, says in but went out 0.8%); learned Brier 0.0312
- Oracle (SF): 1,843 balls, 22% out; physics wrong 4.9%; learned Brier 0.0405
## Where the physics goes wrong (B), by its own clearance
- clearance -99 to -10 ft: 15,724 balls, really out 1%; the learned odds average 0%
- clearance -10 to -3 ft: 30,375 balls, really out 1%; the learned odds average 1%
- clearance -3 to +0 ft: 1,860 balls, really out 22%; the learned odds average 21%
- clearance +0 to +3 ft: 1,612 balls, really out 63%; the learned odds average 64%
- clearance +3 to +10 ft: 3,984 balls, really out 90%; the learned odds average 91%
- clearance +10 to +99 ft: 8,604 balls, really out 98%; the learned odds average 99%
- the odds the app uses: Oracle logistic(0.575 x clearance +1.585); all parks logistic(0.450 x clearance -0.656) (apps/web/public/wall_odds.json)
