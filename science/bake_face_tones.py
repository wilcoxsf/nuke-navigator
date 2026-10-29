"""Bake each player's headshot into a high-resolution tone map and mask (160 by 160, head and shoulders, contrast-enhanced, background removed) so the browser can turn it into any character-art
style at runtime (apps/web/src/cockpits/art.js). Reuses the background removal and cropping from headshot_to_ascii.py. Only the processed tone arrays are written (git-ignored: derived from MLB photos);
the originals stay in scratch/headshots_raw. Output: apps/web/public/faces_tone.json and a preview PNG at Documents/NukeNavigator/ui-options/ascii-lab/tones.png.
29 Oct (every batter in replay.json now has a photo, 241 in all): tone and mask are packed 4 bits each into one byte ("p"), so the file stays near 8 MB instead of 16;
and each face carries its skin tone ("skin", a hex color: the median of the skin-colored pixels on the cheeks and nose), for the stand-in batter. Players MLB had no photo of
(scratch/headshots_generic.json) are left out."""
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
generic = set(map(str, json.load(open(ROOT + "scratch/headshots_generic.json")))) if os.path.exists(ROOT + "scratch/headshots_generic.json") else set()


def skin_of(rgb, fg):
    """Median color of the skin-like pixels (YCbCr skin box) on the cheeks and nose, or None. The place comes from the same head box the tone crop uses: below the
    eyes (0.40 of its height) and above the mustache (0.56), the middle 28% of its width."""
    h, w = fg.shape
    x0, y0, x1, y1 = H.head_box(fg, 1.0)
    bw, bh, cx = x1 - x0, y1 - y0, (x0 + x1) / 2
    band = np.zeros_like(fg)
    band[max(0, int(y0 + 0.40 * bh)):min(h, int(y0 + 0.56 * bh)), max(0, int(cx - 0.14 * bw)):min(w, int(cx + 0.14 * bw))] = True
    px = rgb[fg & band]
    if len(px) < 120:
        return None
    r, g, b = px[:, 0], px[:, 1], px[:, 2]
    cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
    cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
    y = 0.299 * r + 0.587 * g + 0.114 * b
    ok = (cb > 77) & (cb < 127) & (cr > 133) & (cr < 173) & (y > 35) & (y < 235) & (r > b)
    if ok.sum() < 80:
        return None
    m = np.median(px[ok], axis=0)
    return "#%02x%02x%02x" % tuple(int(round(v)) for v in m)


out, tiles = {}, []
for path in sorted(glob.glob(ROOT + "scratch/headshots_raw/*.png")):
    pid = os.path.splitext(os.path.basename(path))[0]
    if pid in generic:
        continue
    rgb, alpha = H.load_rgb(path)
    fg = alpha if alpha is not None else H.person_mask(rgb)
    box = H.head_box(fg, 1.0)
    lum, soft, hard = H.crop_tone(rgb, fg, box, N, N)
    t = H.enhance(lum, hard, local=0.9, sharp=0.6, boost=0.35, boost_sigma=4.0)
    tone = (np.clip(t, 0, 1) * 255).astype(np.uint8)
    mask = (np.clip(soft, 0, 1) * 255).astype(np.uint8)
    packed = ((tone >> 4) << 4 | (mask >> 4)).astype(np.uint8)
    out[pid] = {"w": N, "h": N, "p": base64.b64encode(packed.tobytes()).decode(), "skin": skin_of(rgb, fg), "name": (bio.get(pid) or {}).get("fullName")}
    tiles.append(Image.fromarray(np.where(mask > 100, tone, 24).astype(np.uint8)))
    print(pid, "ok", int(hard.sum()), "px in mask", out[pid]["skin"], flush=True)
json.dump(out, open(ROOT + "apps/web/public/faces_tone.json", "w"), separators=(",", ":"))
os.makedirs("C:/Users/andrewwi/Documents/NukeNavigator/ui-options/ascii-lab", exist_ok=True)
sheet = Image.new("L", (N * 5, N * 2))
for i, im in enumerate(tiles[:10]):
    sheet.paste(im, ((i % 5) * N, (i // 5) * N))
sheet.save("C:/Users/andrewwi/Documents/NukeNavigator/ui-options/ascii-lab/tones.png")
print("faces", len(out))
