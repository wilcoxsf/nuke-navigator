"""Voxel Coke bottle and glove for Study 25, baked from the ORIGINAL park model's own triangles (data/raw/drive/Stadium_SF.glb).
History: 29 Oct, Andrew: "Can we actually build voxel coke bottle and mitt instead of having the 3D models?"; later the same day the wireframe-edge voxels read as
scattered noise ("The coke bottle not there yet ... The coca cola text needs to be in voxel"), so this bake works from the model's surfaces instead.
  the bottle: the model's bottle is a skeleton (ten rings round it and eleven tubes along it, the slides). Its envelope (the outer edge of those triangles along the
    bottle's own axis) is revolved into a closed shell of 0.25 m cubes: hollow, closed at the base, a lip ring round the open mouth (30 Oct: no cap, so it reads hollow).
    It stands on its base by the concourse with its neck up (30 Oct: the model has it the other way round). Its middle is the red
    label, and "Coca-Cola" in a bold script runs along it in white cubes of 0.2 m raised off the label, facing home plate, upright and reading left to right from there.
  the glove: the model's glove triangles voxelized at 0.25 m, closed and filled solid (no hole through it), drawn as its shell.
Output: apps/web/public/coke_vox.json (git-ignored: derived from the park model). Usage: py science/bake_coke_vox.py (needs trimesh, scipy, Pillow: the cadenv python)
"""
import json

import numpy as np
import trimesh
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
V, VF = 0.25, 0.2  # the shell's cubes, the letters' cubes
HOME = np.array([0.3, 0.0, 1.0])  # home plate in the page's world frame (toWorld([0, 0, 0]))
BOX = dict(x=(-80, -38), z=(-160, -112), y=(6.5, 30))

# ---- the triangles in the Coke corner, split into connected pieces ----
scene = trimesh.load(ROOT + "data/raw/drive/Stadium_SF.glb", force="scene")
tri = []
for g in scene.dump(concatenate=False):
    v, f = np.asarray(g.vertices), np.asarray(g.faces)
    if not len(f):
        continue
    T = v[f]
    c = T.mean(axis=1)
    sel = (c[:, 0] > BOX["x"][0]) & (c[:, 0] < BOX["x"][1]) & (c[:, 2] > BOX["z"][0]) & (c[:, 2] < BOX["z"][1]) & (c[:, 1] > BOX["y"][0]) & (c[:, 1] < BOX["y"][1])
    if sel.any():
        tri.append(T[sel])
T = np.concatenate(tri)
q = np.round(T.reshape(-1, 3) / 0.001).astype(np.int64)
vid = np.unique(q, axis=0, return_inverse=True)[1].ravel()
F = vid.reshape(-1, 3)
A = coo_matrix((np.ones(F.size), (np.repeat(np.arange(len(F)), 3), F.ravel())), shape=(len(F), vid.max() + 1)).tocsr()
ncomp, lab = connected_components(A @ A.T, directed=False)


def inside_box(P, x, y, z):
    return (P[:, 0].min() >= x[0]) and (P[:, 0].max() <= x[1]) and (P[:, 1].min() >= y[0]) and (P[:, 1].max() <= y[1]) and (P[:, 2].min() >= z[0]) and (P[:, 2].max() <= z[1])


bottle_t, glove_t = [], []
for k in range(ncomp):
    Tk = T[lab == k]
    P = Tk.reshape(-1, 3)
    ext = P.max(0) - P.min(0)
    if max(ext) < 1.2 or (max(ext[0], ext[2]) < 1.0 and ext[1] > 2.5):  # bolts, posts and railings
        continue
    if inside_box(P, (-73, -54.5), (7, 23.5), (-146, -118)):
        bottle_t.append(Tk)
    elif inside_box(P, (-56.5, -43.5), (10.5, 21), (-149, -138.5)):
        glove_t.append(Tk)
bottle_t, glove_t = np.concatenate(bottle_t), np.concatenate(glove_t)
print("bottle triangles", len(bottle_t), "glove triangles", len(glove_t))


def sample(Tr, step):
    out = []
    for a, b, c in Tr:
        L = max(np.linalg.norm(b - a), np.linalg.norm(c - a), np.linalg.norm(c - b))
        n = max(1, int(np.ceil(L / step)))
        i, j = np.meshgrid(np.arange(n + 1), np.arange(n + 1))
        m = (i + j) <= n
        out.append(a + (b - a) * (i[m] / n)[:, None] + (c - a) * (j[m] / n)[:, None])
    return np.concatenate(out)


# ---- the bottle's frame: its axis (base to neck), the envelope of the model's rings and tubes along it ----
PB = sample(bottle_t, 0.1)
c0 = PB.mean(0)
u = np.linalg.svd(PB - c0, full_matrices=False)[2][0]
s = (PB - c0) @ u
r = np.linalg.norm((PB - c0) - np.outer(s, u), axis=1)
# t runs from the base (0) to the mouth (100). The model's bottle lies with its neck at the LOW end (the slides come out of the mouth onto the concourse), so the
# narrow end is found from the triangles rather than assumed
q10 = (s - s.min()) / (s.max() - s.min())
if np.percentile(r[q10 < 0.12], 90) < np.percentile(r[q10 > 0.88], 90):  # the narrow end first: turn round
    u, s = -u, -s
s0, s1 = s.min(), s.max()
L = s1 - s0
NB = 51
prof = []
for k in range(NB):
    t = s0 + L * k / (NB - 1)
    m = np.abs(s - t) < L * 0.025
    prof.append(float(np.percentile(r[m], 97)) if m.sum() > 20 else None)
for k in range(NB):
    if prof[k] is None:
        prof[k] = prof[k - 1] if k else 1.0
prof = np.array(prof)
prof = ndi.median_filter(prof, size=5, mode="nearest")
prof = ndi.uniform_filter1d(prof, size=3, mode="nearest")
print("length", round(L, 2), "radius profile", np.round(prof, 2).tolist())
# 30 Oct (Andrew: "The coke bottle is backwards and not hollow lol"): the real one stands on its base with its neck up, so the outline is turned end for end
# along the same axis: the wide base where the model's neck was (low, by the concourse), the neck at the high end
u, s0, s1 = -u, -s1, -s0


def R(t):  # t in 0..100 along the bottle
    f = np.clip(t / 2, 0, NB - 1)
    k = np.floor(f).astype(int)
    j = np.minimum(NB - 1, k + 1)
    return prof[k] + (prof[j] - prof[k]) * (f - k)


# the lip: a ring a cube proud just under the mouth; the cap above it
LIP, CAP = (93.0, 96.5), 96.5


def Rshell(t):
    return R(t) + np.where((t >= LIP[0]) & (t < LIP[1]), V, 0.0)


# ---- the shell: every 0.25 m cell inside the revolved outline, kept where it touches the outside ----
lo = c0 - np.abs(u) * L * 0.55 - prof.max() - 1
hi = c0 + np.abs(u) * L * 0.55 + prof.max() + 1
lo, hi = np.minimum(lo, hi), np.maximum(lo, hi)
o = np.floor(lo / V) * V
shape = np.ceil((hi - o) / V).astype(int) + 1
I, J, K = np.indices(shape)
Pc = o + (np.stack([I, J, K], -1) + 0.5) * V
d = Pc - c0
sc = d @ u
rc = np.linalg.norm(d - sc[..., None] * u, axis=-1)
tc = (sc - s0) / L * 100
solid = (tc >= 0) & (tc <= 100) & (rc <= Rshell(np.clip(tc, 0, 100)))
shell = solid & ~ndi.binary_erosion(solid, structure=ndi.generate_binary_structure(3, 1))
shell &= ~((tc > 97.5) & (rc < Rshell(np.clip(tc, 0, 100)) - 1.5 * V))  # the mouth open, no cap: it reads hollow
ijk = np.argwhere(shell)
tt = tc[shell]

# the frame the label lives in: e1 points from the axis toward home plate (square to the axis), e2 = u x e1; angle 0 faces home
toHome = HOME - c0
e1 = toHome - (toHome @ u) * u
e1 /= np.linalg.norm(e1)
e2 = np.cross(u, e1)
# lift the word's centre a little toward the sky so the broadcast camera, which looks down on it, sees it square
up = np.array([0.0, 1.0, 0.0])
aC = 0.35 * np.arctan2(up @ e2, up @ e1)
ang = np.arctan2(d[shell] @ e2, d[shell] @ e1)
LB = (12.0, 68.0)  # the label band along the bottle: the body, base side of the waist and shoulder
code = np.zeros(len(ijk), int)  # 0 glass, 1 glass highlight, 2 label red, 3 label rim, 4 cap, 5 lip
h = (ijk[:, 0] * 73856093) ^ (ijk[:, 1] * 19349663) ^ (ijk[:, 2] * 83492791)
code[(np.abs(((ang - aC - 0.9) + np.pi) % (2 * np.pi) - np.pi) < 0.12) & (tt > 6) & (tt < 90)] = 1  # a glint running up the glass
code[(tt >= LB[0]) & (tt <= LB[1])] = 2
code[((np.abs(tt - LB[0]) < 0.6) | (np.abs(tt - LB[1]) < 0.6))] = 3
code[(tt >= LIP[0]) & (tt < LIP[1])] = 5
code[tt >= CAP] = 5  # the rim of the open mouth, like the lip
print("shell cubes", len(ijk), {k: int((code == k).sum()) for k in range(6)})

# ---- the word: "Coca-Cola" in a bold script along the bottle, as white cubes of 0.2 m raised off the label ----
# reading direction: from home plate the word must run left to right and stand upright (its top toward the sky)
fwd = c0 - HOME
fwd /= np.linalg.norm(fwd)
right = np.cross(fwd, up)
dirS = 1.0 if u @ right > 0 else -1.0  # +1: the word runs base to neck
# the word's "up" round the bottle: increasing angle runs along e2 at the centre; the top of the letters must point skyward
upA = 1.0 if (np.cos(aC) * e2 - np.sin(aC) * e1) @ up > 0 else -1.0
FONT = "C:/Windows/Fonts/SCRIPTBL.TTF"
WORD = "Coca-Cola"
CAPH = 2.1  # metres from the baseline to the top of the capitals
fnt = ImageFont.truetype(FONT, 400)
bb = ImageDraw.Draw(Image.new("L", (10, 10))).textbbox((0, 0), WORD, font=fnt)
img = Image.new("L", (bb[2] - bb[0] + 40, bb[3] - bb[1] + 40), 0)
ImageDraw.Draw(img).text((20 - bb[0], 20 - bb[1]), WORD, font=fnt, fill=255)
glyph = np.array(img) > 127
ys, xs = np.nonzero(glyph)
glyph = glyph[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
gh, gw = glyph.shape
mpp = CAPH * 1.25 / gh  # metres per glyph pixel (the whole glyph box, ascenders to descenders, is a bit taller than the capitals)
wordLen = gw * mpp
tMid = (LB[0] + LB[1]) / 2
print("word", round(wordLen, 2), "m long,", round(gh * mpp, 2), "m tall; band", round((LB[1] - LB[0]) / 100 * L, 2), "m")
# thicken: strokes at least two letter cubes wide (the font's own stroke is measured on its ridge, the distance to the edge at the middle of a stroke)
dt = ndi.distance_transform_edt(glyph)
ridge = (dt == ndi.maximum_filter(dt, size=3)) & (dt > 2)
stroke = 2 * np.percentile(dt[ridge], 25) * mpp
grow = max(0.0, (2 * VF * 1.05 - stroke) / 2) / mpp
if grow > 0:
    glyph = ndi.distance_transform_edt(~glyph) <= grow
print("stroke", round(stroke, 3), "m before, grown by", round(grow * mpp, 3), "m each side")
# every 0.2 m cell just outside the label: its place on the glyph
lo2 = c0 - np.abs(u) * L * 0.55 - prof.max() - 1.5
of = np.floor(np.minimum(lo2, c0 + np.abs(u) * L * 0.55 + prof.max() + 1.5) / VF) * VF
hi2 = np.maximum(lo2, c0 + np.abs(u) * L * 0.55 + prof.max() + 1.5)
shp = np.ceil((hi2 - of) / VF).astype(int) + 1
I, J, K = np.indices(shp)
Q = of + (np.stack([I, J, K], -1) + 0.5) * VF
dq = Q - c0
sq = dq @ u
tq = (sq - s0) / L * 100
rq = np.linalg.norm(dq - sq[..., None] * u, axis=-1)
aq = np.arctan2(dq @ e2, dq @ e1)
band = (tq > LB[0] + 1) & (tq < LB[1] - 1)
Rq = Rshell(np.clip(tq, 0, 100))
shellR = Rq + V * 0.5  # the outer face of the shell
near = band & (rq > shellR - 0.02) & (rq <= shellR + VF * 1.05)
# glyph coordinates: x along the bottle, y round it (arc length from the word's centre line)
gx = (dirS * (sq - (s0 + L * tMid / 100))) / mpp + gw / 2
arc = (((aq - aC) + np.pi) % (2 * np.pi) - np.pi) * Rq
gy = gh / 2 - upA * arc / mpp
inG = near & (gx >= 0) & (gx < gw) & (gy >= 0) & (gy < gh)
gxi, gyi = np.clip(gx.astype(int), 0, gw - 1), np.clip(gy.astype(int), 0, gh - 1)
letter = inG & glyph[gyi, gxi]
lt = np.argwhere(letter)
print("letter cubes", len(lt))
Image.fromarray((glyph * 255).astype(np.uint8)).save(ROOT + "scratch/coke_word.png")  # for a look (scratch/ is git-ignored)

# ---- the glove: its triangles voxelized, closed and filled, its shell ----
PG = sample(glove_t, V * 0.4)
og = np.floor(PG.min(0) / V) * V - V * 2
gi = np.floor((PG - og) / V).astype(int)
Gs = np.zeros(gi.max(0) + 4, bool)
Gs[tuple(gi.T)] = True
Gs = ndi.binary_closing(Gs, structure=ndi.generate_binary_structure(3, 1), iterations=1)  # seal pinholes only: a wider closing fused the fingers
Gs = ndi.binary_fill_holes(Gs)
labG, nG = ndi.label(Gs)
if nG > 1:
    sz = ndi.sum(Gs, labG, range(1, nG + 1))
    Gs = labG == (1 + int(np.argmax(sz)))
gshell = Gs & ~ndi.binary_erosion(Gs, structure=ndi.generate_binary_structure(3, 1))
gk = np.argwhere(gshell)
gp = og + (gk + 0.5) * V
# shade by how buried each cell is (a cheap ambient occlusion: solid cells in the 7-cube neighbourhood), so the gaps between the fingers and the pocket read dark
occ = ndi.uniform_filter(Gs.astype(float), size=7)[gshell]
qs = np.percentile(occ, [30, 65, 88])
gshade = np.digitize(occ, qs)  # 0 open (lit) .. 3 deep in a crease
print("glove solid", int(Gs.sum()), "shell", len(gk), "size m", np.round((gk.max(0) - gk.min(0) + 1) * V, 2).tolist())

out = {
    "v": V, "o": [round(float(x), 4) for x in o], "bottle": np.column_stack([ijk, code]).astype(int).ravel().tolist(),
    "vf": VF, "of": [round(float(x), 4) for x in of], "letters": lt.astype(int).ravel().tolist(),
    "og": [round(float(x), 4) for x in og], "glove": np.column_stack([gk, gshade]).astype(int).ravel().tolist(),
    "c0": [round(float(x), 4) for x in c0], "axis": [round(float(x), 5) for x in u], "s0": round(float(s0), 4), "L": round(float(L), 4),
    "prof": [round(float(x), 3) for x in prof], "band": list(LB), "lip": list(LIP), "e1": [round(float(x), 5) for x in e1],
    "wordH": round(float(CAPH), 2),
}
json.dump(out, open(ROOT + "apps/web/public/coke_vox.json", "w"), separators=(",", ":"))
print("written")
