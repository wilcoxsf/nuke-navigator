"""Cut GPT's dotted concept sheets (four PNGs in Downloads) into frames. Each sheet is a few regions (quadrants of a layout); inside a region the rows are found from gaps in the ink profile
(ink = pixels brighter than 150, which keeps the white dots and the orange accent and drops the gray panel borders), and each row is cut into frames at its own gaps.
Writes apps/web/public/gpt_art.json (git-ignored; each frame a small PNG data URL with sheet, region, row, column) and a numbered contact sheet per sheet for checking the order
(Documents/NukeNavigator/ui-options/ascii-lab/gpt_sheet_N.png)."""
import base64
import io
import json
import os
import shutil

import numpy as np
from PIL import Image, ImageDraw

DL = "C:/Users/andrewwi/Downloads/"
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
OUT = "C:/Users/andrewwi/Documents/NukeNavigator/ui-options/ascii-lab/"
SHEETS = {
    1: ("Dot-Matrix Baseball Swing Sequence-1.png", {"ALL": [0, 0, 1672, 941]}),
    2: ("Baseball Dot-Matrix Motion Atlas-2.png", {"TL": [8, 8, 832, 615], "TR": [842, 8, 1666, 615], "BL": [8, 624, 832, 930], "BR": [842, 624, 1666, 930]}),
    3: ("Dotted Baseball Motion Reference Sheet-3.png", {"TL": [0, 0, 762, 642], "TR": [774, 0, 1536, 642], "BL": [0, 655, 762, 1000], "BR": [774, 655, 1536, 1000]}),
    4: ("Baseball Motion Capture Dot Grid-4.png", {"TL": [0, 0, 762, 655], "TR": [776, 0, 1536, 655], "BL": [0, 668, 762, 1024], "BR": [776, 668, 1536, 1024]}),
}
os.makedirs(ROOT + "scratch/gpt_art", exist_ok=True)
os.makedirs(OUT, exist_ok=True)


def runs(profile, min_gap):
    """[start, stop) spans where profile > 0, merging spans separated by fewer than min_gap empty entries."""
    spans, start, gap = [], None, 0
    for i, v in enumerate(profile):
        if v > 0:
            if start is None:
                start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                spans.append((start, i - gap + 1)); start = None; gap = 0
    if start is not None:
        spans.append((start, len(profile) - gap))
    return spans


result = {}
for n, (name, regions) in SHEETS.items():
    shutil.copy(DL + name, ROOT + f"scratch/gpt_art/sheet{n}.png")
    im = Image.open(DL + name).convert("RGB")
    a = np.asarray(im).max(axis=2)
    ink = a > 150
    frames = []
    for reg, (x0, y0, x1, y1) in regions.items():
        sub = ink[y0:y1, x0:x1]
        rows = [s for s in runs(sub.sum(axis=1), 5) if s[1] - s[0] >= 24]
        for r, (ry0, ry1) in enumerate(rows):
            band = sub[ry0:ry1]
            cols = [s for s in runs(band.sum(axis=0), 11) if s[1] - s[0] >= 18]
            for c, (cx0, cx1) in enumerate(cols):
                piece = band[:, cx0:cx1]
                ys = np.where(piece.any(axis=1))[0]
                fy0, fy1 = ry0 + ys.min(), ry0 + ys.max() + 1
                bx0, by0, bx1, by1 = x0 + cx0 - 3, y0 + fy0 - 3, x0 + cx1 + 3, y0 + fy1 + 3
                bx0, by0 = max(0, bx0), max(0, by0)
                tile = Image.fromarray(np.where(a[by0:by1, bx0:bx1] > 150, a[by0:by1, bx0:bx1], 0).astype(np.uint8))
                buf = io.BytesIO(); tile.save(buf, "PNG", optimize=True)
                frames.append({"region": reg, "row": r, "col": c, "w": tile.width, "h": tile.height, "bbox": [int(bx0), int(by0), int(bx1), int(by1)], "png": "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()})
    result[str(n)] = {"sheet": name, "size": list(im.size), "frames": frames}
    sheet = im.copy(); d = ImageDraw.Draw(sheet)
    for f in frames:
        bx0, by0, bx1, by1 = f["bbox"]
        d.rectangle([bx0, by0, bx1, by1], outline=(255, 60, 60))
        d.text((bx0 + 3, by0 + 2), f"{f['region']}{f['row']},{f['col']}", fill=(255, 220, 0))
    sheet.save(OUT + f"gpt_sheet_{n}.png")
    per = {}
    for f in frames:
        per.setdefault(f["region"], {}).setdefault(f["row"], 0)
        per[f["region"]][f["row"]] += 1
    print(f"sheet {n}: {len(frames)} frames", {k: list(v.values()) for k, v in per.items()}, flush=True)
json.dump(result, open(ROOT + "apps/web/public/gpt_art.json", "w"), separators=(",", ":"))
print("written", os.path.getsize(ROOT + "apps/web/public/gpt_art.json") // 1024, "KB")
