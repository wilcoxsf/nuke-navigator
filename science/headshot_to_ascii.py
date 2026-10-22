"""Turn MLB headshots into ASCII faces for the Nuke Navigator giants_faces.json.

Offline only. The originals live in scratch/headshots_raw/{mlbam_id}.png (git-ignored,
downloaded once, never hotlinked). Only the ASCII text is written to the repo output.

Usage (use `py`, not python; run with -I so nothing loads from the originals folder):
    py -I science/headshot_to_ascii.py 457763 518516            # convert those ids
    py -I science/headshot_to_ascii.py --all                    # every png in the raw folder
    py -I science/headshot_to_ascii.py 457763 --fetch-bio       # also fetch bio (1 request per id)
    py -I science/headshot_to_ascii.py --all --recipe edges     # pick a recipe (default: plain)
    py -I science/headshot_to_ascii.py --all --sheet PATH.png   # also write a contact sheet

Getting a new player: download the headshot ONCE by hand into scratch/headshots_raw/{id}.png
(img.mlbstatic.com .../people/{id}/headshot/67/current, plain identified User-Agent, 2 s apart),
then run this with the id. Bio (name, number, bats, throws, pos) comes from
scratch/headshots_bio.json (id -> fields) or --fetch-bio, which asks
https://statsapi.mlb.com/api/v1/people/{id} (2 s apart, stops on 401/403/429).
The output JSON merges with existing entries.

Pipeline (shared by all recipes)
  1. background removal: the studio backdrop is a flat grey, so take the colour of the frame
     border, flood from the border, keep the largest remaining blob (alpha is used instead if
     the PNG has any)
  2. crop around the head (photos are framed at a standard scale), corrected for the 2.25:1
     character cell so faces are not stretched
  3. luminance at 8x18 px per character cell, percentile stretch, local contrast (masked
     normalised convolution), mid-scale band-pass boost so eyes / brows / mouth / beard edge
     survive, faint rim light on the silhouette (a black cap would otherwise melt into the
     black ground)
  4. recipes
       plain   - cell value = 60% mean + 40% 15th percentile of its pixels (keeps thin dark
                 features), gamma 1.4, half rank-equalised, quantised to ' .:-=+*#%@'. Skin-tone gain keeps dark faces darker. DEFAULT.
       fs      - same values, Floyd-Steinberg dithered
       bayer   - same values, Bayer 4x4 ordered dither
       edges   - plain, then strong interior edges overwritten by / \\ | - by edge direction
       glyph   - each cell picks the Consolas glyph whose 8x18 ink pattern best matches the patch
       lowres  - baseline: resample straight to cols x rows, stretch, Floyd-Steinberg
"""
import argparse
import datetime
import glob
import json
import os
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

REPO = "C:/Users/andrewwi/dev/nuke-navigator-new"
RAW = REPO + "/scratch/headshots_raw"
OUT = REPO + "/apps/web/public/giants_faces.json"
BIO = REPO + "/scratch/headshots_bio.json"
FONT = "C:/Windows/Fonts/consola.ttf"
CELL_W, CELL_H = 8, 18          # pixel cell used for tone reduction, glyph matching, previews
CELL_ASPECT = 2.25              # character cell height / width in the app
SIZES = {"badge": (28, 14), "portrait": (56, 26)}
HEAD_CROP_H = 495               # px of a 640 px tall headshot from cap top to below the beard
CROP_TOP, CROP_BOTTOM = 0.10, 0.98   # fraction of that span that is kept (cap crown is skipped)
UA = {"User-Agent": "nuke-navigator-research/0.1 (personal project)"}

RAMP = " .:-=+*#%@"
GLYPHS = " .,'`:;-_~=+*^\"!|/\\()[]<>ilxoyvnwmMWNO%#@&"
RECIPES = ["plain", "fs", "bayer", "edges", "glyph", "lowres"]


# ----------------------------------------------------------------------------- image prep
def load_rgb(path):
    im = Image.open(path)
    if im.mode == "RGBA":
        a = np.asarray(im.getchannel("A"), dtype=np.float32) / 255.0
        bg = Image.new("RGB", im.size, (128, 128, 128))
        bg.paste(im, mask=im.getchannel("A"))
        return np.asarray(bg, dtype=np.float32), a > 0.5
    return np.asarray(im.convert("RGB"), dtype=np.float32), None


def person_mask(rgb):
    """Foreground mask for a flat studio backdrop (soft vignette): distance from the per-row
    border colour, flood from the border, largest remaining blob, fill holes."""
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[:12, :, :].reshape(-1, 3),
                             rgb[:int(h * 0.45), :10, :].reshape(-1, 3),
                             rgb[:int(h * 0.45), -10:, :].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    edge = np.concatenate([rgb[:, :8, :], rgb[:, -8:, :]], axis=1)
    rowbg = ndi.gaussian_filter1d(np.median(edge, axis=1), 25, axis=0)
    d = np.sqrt(((rgb - rowbg[:, None, :]) ** 2).sum(axis=2))
    d = np.minimum(d, np.sqrt(((rgb - bg) ** 2).sum(axis=2)) + 6)
    near = ndi.binary_opening(d < 26, iterations=1)
    lab, _ = ndi.label(near)
    touch = set(np.unique(np.concatenate([lab[0, :], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ndi.binary_opening(~np.isin(lab, list(touch)), iterations=2)
    lab, n = ndi.label(fg)
    if n > 1:
        fg = lab == (1 + int(np.argmax(ndi.sum(fg, lab, range(1, n + 1)))))
    fg = ndi.binary_fill_holes(fg)
    return ndi.binary_closing(fg, iterations=3)


def head_box(fg, aspect):
    """Crop box (x0, y0, x1, y1) in source px around the head for a given width/height."""
    h, w = fg.shape
    top = np.where(fg.any(axis=1))[0].min()
    mids = []
    for y in range(top + int(0.08 * h), top + int(0.40 * h)):
        xs_ = np.where(fg[y])[0]
        if len(xs_):
            mids.append((xs_.min() + xs_.max()) / 2.0)
    cx = float(np.median(mids))
    full = HEAD_CROP_H * h / 640.0
    ch = full * (CROP_BOTTOM - CROP_TOP)
    cw = ch * aspect
    return cx - cw / 2, top + CROP_TOP * full, cx + cw / 2, top + CROP_TOP * full + ch


def crop_tone(rgb, fg, box, out_w, out_h):
    """Crop+resample luminance (bg = 0) and mask to (out_w, out_h), premultiplied so edges
    stay clean. Returns lum 0..1, soft mask, hard mask."""
    x0, y0, x1, y1 = box
    lum = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) / 255.0

    def crop(arr):
        im = Image.fromarray(arr.astype(np.float32), mode="F")
        return np.asarray(im.transform((out_w, out_h), Image.EXTENT, (x0, y0, x1, y1),
                                       resample=Image.BICUBIC, fillcolor=0.0), dtype=np.float32)

    s = max(0.0, (x1 - x0) / out_w * 0.45)       # antialias before the downscale
    L = crop(ndi.gaussian_filter(lum * fg, s))
    M = np.clip(crop(ndi.gaussian_filter(fg.astype(np.float32), s)), 0, 1)
    lumn = np.clip(np.where(M > 0.05, L / np.maximum(M, 0.05), 0.0), 0, 1)
    return lumn, M, M > 0.5


def enhance(lum, mask, local=0.9, sharp=0.0, boost=0.0, boost_sigma=5.0, rim=0.0, rim_px=1, gamma=1.0):
    """Percentile stretch inside the mask, local contrast (normalised convolution), optional
    unsharp / mid-scale band-pass boost, optional rim light on the silhouette."""
    if mask.sum() < 10:
        return lum
    lo, hi = np.percentile(lum[mask], [2, 98])
    t = np.where(mask, np.clip((lum - lo) / max(hi - lo, 1e-3), 0, 1), 0.0)
    sig = max(lum.shape) * 0.11
    wsum = ndi.gaussian_filter(mask.astype(np.float32), sig) + 1e-4
    mean = ndi.gaussian_filter(t * mask, sig) / wsum
    sq = ndi.gaussian_filter((t ** 2) * mask, sig) / wsum
    std = np.sqrt(np.maximum(sq - mean ** 2, 1e-4))
    loc = 0.5 + 0.28 * (t - mean) / np.maximum(std, 0.12)
    t = (1 - local) * t + local * (0.55 * loc + 0.45 * t)
    t = np.where(mask, np.clip(t, 0, 1), 0.0)
    if sharp:
        t = np.clip(t + sharp * (t - ndi.gaussian_filter(t, 0.9)), 0, 1)
    if boost:
        t = np.clip(t + boost * (t - ndi.gaussian_filter(t, boost_sigma)), 0, 1)
    t = np.where(mask, t, 0.0) ** gamma
    if rim > 0:
        edge = mask & ~ndi.binary_erosion(mask, iterations=rim_px)
        t = np.where(edge, np.maximum(t, rim), t)
    return np.clip(t, 0, 1)


# ----------------------------------------------------------------------------- reducers
def cell_view(a, cols, rows):
    return a.reshape(rows, CELL_H, cols, CELL_W).transpose(0, 2, 1, 3).reshape(rows, cols, -1)


def skin_gain(lum, mask, ref=0.60, power=0.8, lo=0.55, hi=1.15):
    """Equalising removes absolute brightness, but skin tone is a strong identity cue, so
    scale the final values by the median luminance of the mid-face relative to a pale-skin
    reference (dark faces stay darker, pale faces stay bright)."""
    hh, ww = lum.shape
    reg = lum[int(.40 * hh):int(.65 * hh), int(.30 * ww):int(.70 * ww)]
    reg = reg[mask[int(.40 * hh):int(.65 * hh), int(.30 * ww):int(.70 * ww)]]
    if reg.size == 0:
        return 1.0
    return float(np.clip((np.median(reg) / ref) ** power, lo, hi))


def cell_values(t, mask, cols, rows, gamma=1.4, mix=0.4, pct=15, eq=0.5, gain=1.0):
    """Hi-res tone -> one value per character cell (see module docstring)."""
    c = cell_view(t ** gamma, cols, rows)
    v = (1 - mix) * c.mean(axis=2) + mix * np.percentile(c, pct, axis=2)
    cm = cell_view(mask.astype(np.float32), cols, rows).mean(axis=2) > 0.5
    vals = v[cm]
    if len(vals) > 1 and eq > 0:
        ranks = vals.argsort().argsort() / (len(vals) - 1)
        v = v.copy()
        v[cm] = (1 - eq) * vals + eq * ranks
    return np.where(cm, np.clip(v * gain, 0, 1), 0.0), cm


BAYER4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16.0


def quant_plain(v, ramp=RAMP):
    idx = np.clip(np.round(v * (len(ramp) - 1)).astype(int), 0, len(ramp) - 1)
    return ["".join(ramp[i] for i in r) for r in idx]


def quant_floyd(v, ramp=RAMP):
    n = len(ramp)
    a = v.copy() * (n - 1)
    hh, ww = a.shape
    idx = np.zeros((hh, ww), int)
    for y in range(hh):
        for x in range(ww):
            val = a[y, x]
            q = int(min(max(round(val), 0), n - 1))
            idx[y, x] = q
            err = val - q
            if x + 1 < ww:
                a[y, x + 1] += err * 7 / 16
            if y + 1 < hh:
                if x > 0:
                    a[y + 1, x - 1] += err * 3 / 16
                a[y + 1, x] += err * 5 / 16
                if x + 1 < ww:
                    a[y + 1, x + 1] += err * 1 / 16
    return ["".join(ramp[i] for i in r) for r in idx]


def quant_bayer(v, ramp=RAMP):
    n = len(ramp)
    hh, ww = v.shape
    th = np.tile(BAYER4, (hh // 4 + 1, ww // 4 + 1))[:hh, :ww]
    x = v * (n - 1)
    lo = np.floor(x)
    idx = np.clip((lo + ((x - lo) > th)).astype(int), 0, n - 1)
    return ["".join(ramp[i] for i in r) for r in idx]


def overlay_edges(lines, t, cm, cols, rows, pct=80, coh_thr=0.6):
    """Overwrite interior cells on strong, coherent edges with - \\ | / by edge direction
    (structure tensor of the hi-res tone over each cell)."""
    s = ndi.gaussian_filter(t, 1.5)
    gy = ndi.sobel(s, axis=0) / 8.0
    gx = ndi.sobel(s, axis=1) / 8.0
    jxx = cell_view(gx * gx, cols, rows).mean(axis=2)
    jyy = cell_view(gy * gy, cols, rows).mean(axis=2)
    jxy = cell_view(gx * gy, cols, rows).mean(axis=2)
    mag = np.sqrt(np.maximum(jxx + jyy, 0))
    ang = 0.5 * np.degrees(np.arctan2(2 * jxy, jxx - jyy)) % 180
    coh = np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2) / np.maximum(jxx + jyy, 1e-6)
    inner = ndi.binary_erosion(cm, iterations=1)
    if inner.sum() == 0:
        return lines
    thr = np.percentile(mag[inner], pct)
    out = [list(r) for r in lines]
    for y in range(rows):
        for x in range(cols):
            if not inner[y, x] or mag[y, x] < thr or coh[y, x] < coh_thr:
                continue
            tan = (ang[y, x] + 90) % 180
            out[y][x] = "-" if (tan < 22.5 or tan >= 157.5) else "\\" if tan < 67.5 else "|" if tan < 112.5 else "/"
    return ["".join(r) for r in out]


_BANK = {}


def glyph_bank(charset=GLYPHS):
    if charset not in _BANK:
        font = ImageFont.truetype(FONT, 14)
        mats = []
        for ch in charset:
            im = Image.new("L", (CELL_W, CELL_H), 0)
            ImageDraw.Draw(im).text((0, 0), ch, font=font, fill=255)
            mats.append(np.asarray(im, dtype=np.float32) / 255.0)
        _BANK[charset] = (list(charset), np.stack(mats))
    return _BANK[charset]


def glyph_match(t, cols, rows, gamma=1.4, tone_w=4.0, blur=0.8):
    chars, mats = glyph_bank()
    gm = mats.mean(axis=(1, 2))
    tt = ndi.gaussian_filter((t ** gamma) * gm.max(), blur)
    gb = np.stack([ndi.gaussian_filter(m, blur) for m in mats])
    out = []
    for r in range(rows):
        row = []
        for c in range(cols):
            p = tt[r * CELL_H:(r + 1) * CELL_H, c * CELL_W:(c + 1) * CELL_W]
            d = ((gb - p[None]) ** 2).mean(axis=(1, 2)) + tone_w * (gm - p.mean()) ** 2
            row.append(chars[int(np.argmin(d))])
        out.append("".join(row))
    return out


# ----------------------------------------------------------------------------- driver
def convert(path, cols, rows, recipe="plain"):
    rgb, alpha = load_rgb(path)
    fg = alpha if alpha is not None else person_mask(rgb)
    box = head_box(fg, cols / (rows * CELL_ASPECT))
    if recipe == "lowres":
        lum, M, mask = crop_tone(rgb, fg, box, cols, rows)
        return quant_floyd(enhance(lum, mask, sharp=0.9, rim=0.28, gamma=0.85), " .,:;+*#@")
    lum, M, mask = crop_tone(rgb, fg, box, cols * CELL_W, rows * CELL_H)
    t = enhance(lum, mask, local=1.0, boost=1.6, boost_sigma=4.0, rim=0.3, rim_px=3)
    if recipe == "glyph":
        return glyph_match(t, cols, rows)
    v, cm = cell_values(t, mask, cols, rows, gain=skin_gain(lum, mask))
    if recipe == "plain":
        return quant_plain(v)
    if recipe == "fs":
        return quant_floyd(v)
    if recipe == "bayer":
        return quant_bayer(v)
    if recipe == "edges":
        return overlay_edges(quant_plain(v), t, cm, cols, rows)
    raise SystemExit("unknown recipe " + recipe)


def draw_block(d, lines, x0, y0, font, fill=(236, 230, 214)):
    for r, line in enumerate(lines):
        for c, ch in enumerate(line):
            if ch != " ":
                d.text((x0 + c * CELL_W, y0 + r * CELL_H), ch, font=font, fill=fill)


def render_png(blocks, path, pad=12, bgc=(10, 10, 10)):
    """blocks: list of (title, lines), drawn side by side (light text on dark, 8x18 cells)."""
    font = ImageFont.truetype(FONT, 14)
    small = ImageFont.truetype(FONT, 12)
    wid = [max(len(l) for l in lines) * CELL_W for _, lines in blocks]
    hei = [len(lines) * CELL_H for _, lines in blocks]
    im = Image.new("RGB", (sum(wid) + pad * (len(blocks) + 1), max(hei) + pad * 2 + 20), bgc)
    d = ImageDraw.Draw(im)
    x = pad
    for (title, lines), w in zip(blocks, wid):
        d.text((x, 4), title, font=small, fill=(130, 130, 120))
        draw_block(d, lines, x, 24, font)
        x += w + pad
    im.save(path)


def make_sheet(data, ids, path, per_row=2):
    """Contact sheet: each player gets badge + portrait side by side, two players per row."""
    font = ImageFont.truetype(FONT, 14)
    small = ImageFont.truetype(FONT, 12)
    pad = 16
    bw, bh, pw, ph = 28 * CELL_W, 14 * CELL_H, 56 * CELL_W, 26 * CELL_H
    unit_w = bw + pw + pad * 3
    unit_h = ph + 34 + pad
    nrows = (len(ids) + per_row - 1) // per_row
    im = Image.new("RGB", (unit_w * per_row + pad, nrows * unit_h + pad), (10, 10, 10))
    d = ImageDraw.Draw(im)
    for i, pid in enumerate(ids):
        e = data[pid]
        x = pad + (i % per_row) * unit_w
        y = pad + (i // per_row) * unit_h
        label = "%s  #%s  %s  B/T %s/%s  (%s)" % (e["name"], e["number"] or "-", e["pos"], e["bats"], e["throws"], pid)
        d.text((x, y), label, font=small, fill=(150, 150, 138))
        draw_block(d, e["badge"], x, y + 28 + (ph - bh) // 2, font)
        draw_block(d, e["portrait"], x + bw + pad, y + 28, font)
    im.save(path)
    print("sheet", path, im.size)


def fetch_bio(ids, bio):
    import requests
    last = 0.0
    for pid in ids:
        if pid in bio:
            continue
        time.sleep(max(0.0, 2.2 - (time.time() - last)))
        r = requests.get("https://statsapi.mlb.com/api/v1/people/%s" % pid, headers=UA, timeout=30)
        last = time.time()
        print("GET people/%s -> %d" % (pid, r.status_code))
        if r.status_code in (401, 403, 429):
            raise SystemExit("stopping: HTTP %d" % r.status_code)
        r.raise_for_status()
        p = r.json()["people"][0]
        bio[pid] = {
            "name": p.get("fullName"),
            "number": p.get("primaryNumber"),
            "bats": (p.get("batSide") or {}).get("code"),
            "throws": (p.get("pitchHand") or {}).get("code"),
            "pos": (p.get("primaryPosition") or {}).get("abbreviation"),
        }
    return bio


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--raw", default=RAW)
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--bio", default=BIO)
    ap.add_argument("--recipe", default="plain", choices=RECIPES)
    ap.add_argument("--fetch-bio", action="store_true")
    ap.add_argument("--sheet", default=None, help="write a contact sheet PNG of the converted ids")
    a = ap.parse_args()
    ids = list(a.ids)
    if a.all:
        ids = sorted(os.path.splitext(os.path.basename(f))[0] for f in glob.glob(a.raw + "/*.png"))
    if not ids:
        raise SystemExit("give MLBAM ids or --all")
    bio = json.load(open(a.bio, encoding="utf-8")) if os.path.exists(a.bio) else {}
    if a.fetch_bio:
        bio = fetch_bio(ids, bio)
        json.dump(bio, open(a.bio, "w", encoding="utf-8"), indent=1)
    data = json.load(open(a.out, encoding="utf-8")) if os.path.exists(a.out) else {}
    done = []
    for pid in ids:
        src = "%s/%s.png" % (a.raw, pid)
        if not os.path.exists(src):
            print("missing", src)
            continue
        b = bio.get(pid, {})
        entry = {"name": b.get("name"), "number": b.get("number"), "bats": b.get("bats"),
                 "throws": b.get("throws"), "pos": b.get("pos")}
        for key, (c, r) in SIZES.items():
            entry[key] = convert(src, c, r, a.recipe)
        data[pid] = entry
        done.append(pid)
        print("converted", pid, entry["name"])
    data["_meta"] = {
        "recipe": ("Official MLB headshots baked offline, originals not stored. Flat backdrop removed by "
                   "border-colour flood fill; head crop corrected for 2.25:1 character cells; luminance "
                   "at 8x18 px per cell, percentile stretch + local contrast + mid-scale band-pass boost, "
                   "faint silhouette rim; cell value = 60%% mean + 40%% 15th percentile, gamma 1.4, "
                   "half rank-equalised, mid-face skin-tone gain, quantised to the ramp ' .:-=+*#%%@' (recipe '%s'). Badge 28x14, "
                   "portrait 56x26. Plain text, no colour: render bone-white on black." % a.recipe),
        "created": datetime.date.today().isoformat(),
        "source": "statsapi.mlb.com people + img.mlbstatic.com headshots, private use",
        "script": "science/headshot_to_ascii.py",
    }
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=True)
    print("wrote", a.out, len(done), "entries")
    if a.sheet:
        os.makedirs(os.path.dirname(a.sheet), exist_ok=True)
        make_sheet(data, [i for i in ids if i in data], a.sheet)


if __name__ == "__main__":
    main()
