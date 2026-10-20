# Nuke Navigator

A zany, clickable 3D Oracle Park home-run interface, powered by a ball-flight model built to be the best home run and foul ball predictor anywhere.

Status: day zero of the rebuild. The earlier research lives in [nuke-navigator-legacy](https://github.com/wilcoxsf/nuke-navigator-legacy).

## Rules of this repo

- Code only. Stadium models, seat maps and MLB data are never committed; they live in private storage and are fetched at build time.
- `.env` files and keys are never committed.
- CI is for tests and builds. Training runs elsewhere.
