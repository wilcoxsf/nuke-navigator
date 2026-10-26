"""Generic ballplayer faces from the 56 real headshot tone maps, for batters we have no photo of (25 Oct 2026). Nothing here is a likeness of one person:
  PROTOTYPES  k-means on the 160 x 160 tone maps (the headshots are framed to one standard, so the eyes, nose and mouth fall in nearly the same place): each cluster's mean face, with its mask, re-sharpened
  COMPOSITES  averages of a random 45 percent of all faces, so a player gets a plausible face that is not a copy of anyone's
Output public/generic_faces.json: {faces: [{id, kind, w, h, tone, mask}]} in the same format as faces_tone.json (faceSource() reads it). Usage: python science/generic_faces.py"""
import base64
import json

import numpy as np
from scipy import ndimage as ndi

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
d = json.load(open(ROOT + "apps/web/public/faces_tone.json"))
ids = sorted(d)
dec = lambda s, n: np.frombuffer(base64.b64decode(s), np.uint8).astype(float) / 255
T = np.stack([dec(d[i]["tone"], 0).reshape(d[i]["h"], d[i]["w"]) for i in ids])
M = np.stack([dec(d[i]["mask"], 0).reshape(d[i]["h"], d[i]["w"]) for i in ids])
n, h, w = T.shape
print(n, "faces", w, "x", h)
# feature vector: tone inside the mask, blurred a little so k-means groups by overall light, face shape and hair rather than pixel noise
F = np.stack([ndi.gaussian_filter(T[i] * M[i], 3).ravel() for i in range(n)])
rng = np.random.default_rng(11)


def kmeans(X, k, iters=60):
    C = X[rng.choice(len(X), k, replace=False)]
    for _ in range(iters):
        lab = np.argmin(((X[:, None] - C[None]) ** 2).sum(-1), axis=1)
        for j in range(k):
            if (lab == j).any():
                C[j] = X[lab == j].mean(0)
    return lab


# broad classes only, so no cap logo or single face survives the average: faces ranked by the mean tone of the cheek and forehead window (a proxy for skin tone and lighting), cut into thirds; and a mixed third-of-each average
face_win = (slice(int(h * 0.38), int(h * 0.68)), slice(int(w * 0.28), int(w * 0.72)))
skin = np.array([T[i][face_win][M[i][face_win] > 0.5].mean() for i in range(n)])
jaw_win = (slice(int(h * 0.74), int(h * 0.90)), slice(int(w * 0.32), int(w * 0.68)))
beard = np.array([skin[i] - T[i][jaw_win][M[i][jaw_win] > 0.5].mean() for i in range(n)])  # how much darker the jaw is than the cheeks: stubble or a beard
lab = np.zeros(n, int)
for j, chunk in enumerate(np.array_split(np.argsort(skin), 3)):  # skin tone thirds, then each third split at its median beard score
    lo = chunk[beard[chunk] <= np.median(beard[chunk])]
    lab[chunk] = 2 * j + 1
    lab[lo] = 2 * j
K = 6
LAB_NAME = ["darker skin, clean", "darker skin, bearded", "medium skin, clean", "medium skin, bearded", "lighter skin, clean", "lighter skin, bearded"]


def sharpen(t, m):
    t = t.copy()
    soft = ndi.gaussian_filter(t, 9)
    rows = np.clip((0.32 - np.arange(h) / h) / 0.10, 0, 1)[:, None]  # full blur above 22 percent of the height, fading out by 32 percent
    cols = np.clip(1 - np.abs(np.arange(w) / w - 0.5) / 0.30, 0, 1)[None, :] ** 0.4  # only across the middle of the cap, where the logo sits
    t = t * (1 - rows * cols) + soft * rows * cols  # the cap logo melts into a plain dark cap
    b = ndi.gaussian_filter(t, 6)
    out = np.clip(t + 0.9 * (t - b), 0, 1) * (m > 0.5)
    v = out[m > 0.5]
    lo, hi = np.percentile(v, 3), np.percentile(v, 98)
    return np.clip((out - lo) / max(hi - lo, 1e-3), 0, 1) * (m > 0.5)


def pack(tone, mask, fid, kind, note):
    enc = lambda a: base64.b64encode((np.clip(a, 0, 1) * 255).astype(np.uint8).tobytes()).decode()
    return {"id": fid, "kind": kind, "note": note, "w": w, "h": h, "tone": enc(tone), "mask": enc(mask)}


out = []
for j in range(K):
    sel = np.flatnonzero(lab == j)
    if len(sel) < 2:
        continue
    wsum = M[sel].sum(0)
    mean = (T[sel] * M[sel]).sum(0) / np.maximum(wsum, 1e-3)
    mask = (M[sel].mean(0) > 0.5).astype(float)
    mask = ndi.binary_opening(mask, iterations=2).astype(float)
    mean_tone = float(mean[mask > 0.5].mean())
    out.append(pack(sharpen(mean, mask), mask, "P%d" % (j + 1), "prototype", "%s (average of %d faces)" % (LAB_NAME[j], len(sel))))
    print("prototype P%d: %d faces, mean tone %.2f" % (j + 1, len(sel), mean_tone))
all_sel = np.arange(n)
mean = (T * M).sum(0) / np.maximum(M.sum(0), 1e-3)
mask = ndi.binary_opening((M.mean(0) > 0.5).astype(float), iterations=2).astype(float)
out.append(pack(sharpen(mean, mask), mask, "P0", "prototype", "average of all %d faces" % n))
json.dump({"faces": out}, open(ROOT + "apps/web/public/generic_faces.json", "w"))
print("written", len(out), "generic faces")
