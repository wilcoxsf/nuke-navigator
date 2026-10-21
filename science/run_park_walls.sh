#!/bin/bash
# Wall distance and height for all 30 parks from the park models. Below Normal via run_below_normal.ps1. About a minute per park.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
$PY -W ignore park_walls_glb.py ../data/derived/parks/walls_glb 2>&1 | cut -c1-420
echo "== finished"
