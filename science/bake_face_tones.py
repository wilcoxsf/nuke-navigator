"""Bake each player's headshot into a high-resolution tone map and mask (160 by 160, head and shoulders, contrast-enhanced, background removed) so the browser can turn it into any character-art
style at runtime (apps/web/src/cockpits/art.js). Reuses the background removal and cropping from headshot_to_ascii.py. Only the processed tone arrays are written (git-ignored: derived from MLB photos);
the originals stay in scratch/headshots_raw. Output: apps/web/public/faces_tone.json and a preview PNG at Documents/NukeNavigator/ui-options/ascii-lab/tones.png."""
import base64
import glob
import json
import os

import numpy as np
from PIL import Image

import headshot_to_ascii as H

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
N = 160
bio = json.load(open(ROOT + "scratch/headshots_bio.json")) if os.path.exists(ROOT + "scratch/headshots_bio.json") else {}
out, tiles = {}, []
for path in sorted(glob.glob(ROOT + "scratch/headshots_raw/*.png")):
    pid = os.path.splitext(os.path.basename(path))[0]
    rgb, alpha = H.load_rgb(path)
    fg = alpha if alpha is not None else H.person_mask(rgb)
    box = H.head_box(fg, 1.0)
    lum, soft, hard = H.crop_tone(rgb, fg, box, N, N)
    t = H.enhance(lum, hard, local=0.9, sharp=0.6, boost=0.35, boost_sigma=4.0)
    tone = (np.clip(t, 0, 1) * 255).astype(np.uint8)
    mask = (np.clip(soft, 0, 1) * 255).astype(np.uint8)
    out[pid] = {"w": N, "h": N, "tone": base64.b64encode(tone.tobytes()).decode(), "mask": base64.b64encode(mask.tobytes()).decode(), "name": (bio.get(pid) or {}).get("fullName")}
    tiles.append(Image.fromarray(np.where(mask > 100, tone, 24).astype(np.uint8)))
    print(pid, "ok", int(hard.sum()), "px in mask", flush=True)
json.dump(out, open(ROOT + "apps/web/public/faces_tone.json", "w"), separators=(",", ":"))
os.makedirs("C:/Users/andrewwi/Documents/NukeNavigator/ui-options/ascii-lab", exist_ok=True)
sheet = Image.new("L", (N * 5, N * 2))
for i, im in enumerate(tiles[:10]):
    sheet.paste(im, ((i % 5) * N, (i // 5) * N))
sheet.save("C:/Users/andrewwi/Documents/NukeNavigator/ui-options/ascii-lab/tones.png")
print("faces", len(out))
