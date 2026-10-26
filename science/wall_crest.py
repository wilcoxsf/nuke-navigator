"""The orange band, take 2 (24 Oct 2026): ONE continuous line at the exact place a home run happens, the CREST of the outfield wall (top of the padded wall, or the top of the right-field arcade) from foul pole to foul pole.
Take 1 recolored every edge near the measured wall distance, which looked scattered: in many bearings the model's wall is a few huge faces with almost no edges on the crest, and in right-center the measured profile (a constant 421 ft, assumed) is 2 to 7 m outside where the model's wall really is.
So the crest comes from the model SURFACE:
  radius  = the outer edge of the model's field-material surface at that bearing (the wall face is part of it), searched from 9 m inside to 3 m outside the measured distance, so foreign pieces far out are ignored; light running median (7 samples of 0.25 degree)
  height  = the highest model surface point (any material) within 1 m of that radius and inside a height gate around the measured wall height (0.6 times it to +1.5 m); where nothing qualifies, the median of the neighbouring crest heights, else the measured height; light running median (5)
Output: apps/web/public/oracle_crest.json (bearing, radius, height, source flags) and science/wall_crest.md (coverage and cleanliness by 5 degree sector). Usage: python science/wall_crest.py"""
import json

import numpy as np

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
FT = 0.3048
home = np.array([0.3, 1.0])
w = json.load(open(ROOT + "apps/web/public/oracle_wall.json"))
d_raw = np.array(w["wall_ft"], float) * FT
h_raw = np.array(w["height_ft"], float) * FT
b0 = int(w["bearing_deg"][0])
n = len(d_raw)
d_med = np.array([np.median(d_raw[max(0, i - 3):i + 4]) for i in range(n)])
h_med = np.array([np.median(h_raw[max(0, i - 2):i + 3]) for i in range(n)])
th = np.arange(-46.0, 46.01, 0.25)
dm = np.interp(th, np.arange(n) + b0, d_med)
hm = np.interp(th, np.arange(n) + b0, h_med)
rng = np.random.default_rng(0)


def sample(T, per_area=0.03, cap=500):
    area = 0.5 * np.linalg.norm(np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]), axis=1)
    k = np.clip((area / per_area).astype(int) + 3, 3, cap)
    P = []
    for kk in np.unique(k):
        sel = np.flatnonzero(k == kk)
        for s in range(0, len(sel), 20000):
            ss = sel[s:s + 20000]
            u, v = rng.random((len(ss), kk)), rng.random((len(ss), kk))
            f = u + v > 1
            u, v = np.where(f, 1 - u, u), np.where(f, 1 - v, v)
            A, B, C = T[ss, 0][:, None], T[ss, 1][:, None], T[ss, 2][:, None]
            P.append(np.concatenate([(A + u[..., None] * (B - A) + v[..., None] * (C - A)).reshape(-1, 3), T[ss].reshape(-1, 3)]))
    return np.concatenate(P)


def polar(P):
    return np.hypot(P[:, 0] - home[0], P[:, 2] - home[1]), np.degrees(np.arctan2(P[:, 0] - home[0], -(P[:, 2] - home[1])))


def load(file, mats):
    out = []
    g = json.load(open(ROOT + "data/derived/oracle/" + file))
    for m, v in g.items():
        if m in mats:
            V = np.array(v["verts"], np.float32)
            out.append(V[np.array(v["tris"], np.int64).reshape(-1, 3)])
            print(m, "triangles", len(out[-1]))
    return np.concatenate(out)


TF = load("sf_prims.json", ("SF_Field",))
TO = np.concatenate([load("sf_grey.json", ("SF_Greyscale",)), load("sf_prims.json", ("Ads_Padding",))])


def near_wall(T):
    c = T.mean(axis=1)
    rc, bc = polar(c)
    return T[(rc > dm.min() - 12) & (rc < dm.max() + 6) & (np.abs(bc) < 52)]


PF, PO = sample(near_wall(TF), 0.05, 600), sample(near_wall(TO), 0.03, 500)
PA = np.concatenate([PF, PO])
rF, bF = polar(PF)
rA, bA = polar(PA)
oF, oA = np.argsort(bF), np.argsort(bA)
rF, bF, yF = rF[oF], bF[oF], PF[oF, 1]
rA, bA, yA = rA[oA], bA[oA], PA[oA, 1]
print("surface samples: field %d, all %d" % (len(PF), len(PA)))
loF, hiF = np.searchsorted(bF, th - 0.3), np.searchsorted(bF, th + 0.3)
loA, hiA = np.searchsorted(bA, th - 0.3), np.searchsorted(bA, th + 0.3)
r_edge = np.full(len(th), np.nan)
for i in range(len(th)):
    rr = rF[loF[i]:hiF[i]]
    m = (rr > dm[i] - 9) & (rr < dm[i] + 3)
    if m.sum() >= 5:
        r_edge[i] = np.percentile(rr[m], 99.5)
have_r = np.isfinite(r_edge)
r_fill = np.interp(th, th[have_r], r_edge[have_r])
med = lambda a, k: np.array([np.median(a[max(0, i - k):i + k + 1]) for i in range(len(a))])
r_s = med(r_fill, 3)
y_top, r_top, y_src = np.full(len(th), np.nan), np.full(len(th), np.nan), np.zeros(len(th), int)
for i in range(len(th)):
    rr, yy = rA[loA[i]:hiA[i]], yA[loA[i]:hiA[i]]
    m = (rr > r_s[i] - 1.0) & (rr < r_s[i] + 1.0) & (yy > 0.6 * hm[i]) & (yy < hm[i] + 1.5)
    if m.sum() >= 10:
        q = np.percentile(yy[m], 97)  # the 97th percentile, not the maximum: a post or a pole base within a metre of the crest must not drag the line up
        top = m & (yy >= q - 0.05)
        y_top[i], r_top[i], y_src[i] = q, np.median(rr[top]), 1  # height and radius come from the SAME top points, so the line sits on the crest instead of floating between two surfaces
have_y = np.isfinite(y_top)
y_fill = np.where(have_y, y_top, np.interp(th, th[have_y], y_top[have_y]))
r_fill2 = np.where(have_y, r_top, r_s)
# spikes: a running median over +-3 degrees on height (keeps real steps, removes anything narrower than that), +-1.5 degrees on radius; the radius never leaves 1.2 m of the field-edge radius
y_s = med(y_fill, 12)
r_s = np.clip(med(r_fill2, 6), r_s - 1.2, r_s + 1.2)
# SNAP to the surface (24 Oct, after two screengrabs showed the line hanging in air): the wall face is near vertical, so a radius a hand's width outside its top edge has NO surface under it (101 of 369 samples were 3 m above the ground there). A vertical ray at each candidate radius finds the real top.
TS = near_wall(np.concatenate([TF, TO]))
bx0, bx1, bz0, bz1 = TS[:, :, 0].min(1), TS[:, :, 0].max(1), TS[:, :, 2].min(1), TS[:, :, 2].max(1)


def hits(x, z):
    idx = np.flatnonzero((bx0 <= x) & (bx1 >= x) & (bz0 <= z) & (bz1 >= z))
    if not len(idx):
        return np.empty(0)
    t = TS[idx]
    x0, y0, z0, x1, y1, z1, x2, y2, z2 = t[:, 0, 0], t[:, 0, 1], t[:, 0, 2], t[:, 1, 0], t[:, 1, 1], t[:, 1, 2], t[:, 2, 0], t[:, 2, 1], t[:, 2, 2]
    d = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2)
    ok = np.abs(d) > 1e-9
    d = np.where(ok, d, 1.0)
    a = ((z1 - z2) * (x - x2) + (x2 - x1) * (z - z2)) / d
    b = ((z2 - z0) * (x - x2) + (x0 - x2) * (z - z2)) / d
    g = 1 - a - b
    ok &= (a >= -1e-6) & (b >= -1e-6) & (g >= -1e-6)
    return (a * y0 + b * y1 + g * y2)[ok]


def xz(t_deg, r):
    t = np.radians(t_deg)
    return home[0] + r * np.sin(t), home[1] - r * np.cos(t)


def surf(t_deg, r, y_ref, tol):
    """the surface height under (bearing, radius) nearest y_ref, or nan when nothing lies within tol of it"""
    h = hits(*xz(t_deg, r))
    h = h[np.abs(h - y_ref) <= tol]
    return h[np.argmin(np.abs(h - y_ref))] if len(h) else np.nan


# THE WALL FACE (25 Oct, after the right-field screengrab: the line ran 2.6 to 3.7 m deep behind the wall between +20 and +28 degrees, because the field-edge radius is median-filtered and lags where the wall runs diagonally): walk outward along each bearing from 12 m inside the old radius until the model first rises above 1 m. That radius IS the face of the wall; no smoothing across bearings is applied to it.
face = np.full(len(th), np.nan)
for i in range(len(th)):
    for r in np.arange(r_s[i] - 12, r_s[i] + 6, 0.1):
        h = hits(*xz(th[i], r))
        if len(h) and h.max() > 1.0:
            face[i] = r
            break
# single-sample outliers (a post or a gate in front of the wall, or an open gap that lets the ray run on to the stands): beyond 1.5 m from the median of the 9 samples around it, the sample is dropped
fm = np.array([np.nanmedian(face[max(0, i - 4):i + 5]) for i in range(len(th))])
okf = np.isfinite(face) & (np.abs(face - fm) <= 1.5)
face_c = np.where(okf, face, np.interp(th, th[okf], face[okf]))
# height: the 97th percentile of the model's own surface points (vertical faces included) within 0.7 m of that face and 0.3 degree, inside a gate around the old height, so a pole base or the stands behind cannot drag it
y_face, ok_snap = y_s.copy(), np.zeros(len(th), bool)
for i in range(len(th)):
    if not okf[i]:
        continue
    rr, yy = rA[loA[i]:hiA[i]], yA[loA[i]:hiA[i]]
    m = (np.abs(rr - (face_c[i] + 0.15)) <= 0.7) & (yy > 0.6 * y_s[i]) & (yy < y_s[i] + 1.5)
    if m.sum() >= 4:
        y_face[i], ok_snap[i] = np.percentile(yy[m], 97), True
y_face = np.where(ok_snap, y_face, np.interp(th, th[ok_snap], y_face[ok_snap]))
yf = np.array([np.median(y_face[max(0, i - 6):i + 7]) for i in range(len(th))])  # a pole base narrower than 1.5 degrees is a spike; real steps survive a median
# ray-step jitter (rms 0.15 m, up to 0.6 m between neighbouring bearings on a straight wall, visible as wobble near the right-field pole): a 5-sample median then a 5-sample mean; both keep a straight wall straight and only round a corner by about half a degree
fc5 = np.array([np.median(face_c[max(0, i - 2):i + 3]) for i in range(len(th))])
fc5 = np.array([fc5[max(0, i - 2):i + 3].mean() for i in range(len(th))])
r_snap = fc5 + 0.15  # the line sits on the top edge of the face, a hand's width in
y_snap = yf
print("wall face found at %d of %d samples, height from the surface at %d" % (okf.sum(), len(th), ok_snap.sum()))
r_s = np.where(ok_snap, r_snap, np.interp(th, th[ok_snap], r_snap[ok_snap]))
y_s = np.where(ok_snap, y_snap, np.interp(th, th[ok_snap], y_snap[ok_snap]))
# the painted ribbon: the top of the wall itself, a strip up to 0.45 m wide each side of the line, narrowed wherever the surface ends (a ribbon never hangs past an edge)
W = np.arange(0.05, 0.4501, 0.05)
rib = np.zeros((len(th), 4))  # r_in, y_in, r_out, y_out
for i in range(len(th)):
    rib[i] = [r_s[i], y_s[i], r_s[i], y_s[i]]
    if not ok_snap[i]:
        continue
    for k, sgn in enumerate((-1, 1)):
        for w in W[::-1]:
            h = surf(th[i], r_s[i] + sgn * w, y_s[i], 0.12)
            if np.isfinite(h):
                rib[i, 2 * k:2 * k + 2] = [r_s[i] + sgn * w, h]
                break
LIFT = 0.08  # a hand's width off the surface so the line does not z-fight with the wall it sits on; the ribbon uses a depth offset instead
json.dump({"bearing": th.round(3).tolist(), "radius": r_s.round(3).tolist(), "height": (y_s + LIFT).round(3).tolist(), "snapped": ok_snap.astype(int).tolist(), "ribbon": {"r_in": rib[:, 0].round(3).tolist(), "y_in": (rib[:, 1] + 0.02).round(3).tolist(), "r_out": rib[:, 2].round(3).tolist(), "y_out": (rib[:, 3] + 0.02).round(3).tolist(), "y_mid": (y_s + 0.02).round(3).tolist()}, "radius_from_model": have_r.astype(int).tolist(), "height_from_model": y_src.tolist(), "lift": LIFT, "home": home.tolist()}, open(ROOT + "apps/web/public/oracle_crest.json", "w"))
lines = ["# Wall crest from the model surface (24 Oct 2026)", "",
         "bearings -46 to +46 in 0.25 degree steps: %d samples; the field-surface edge supplied the radius at %.0f%% and a model surface point the height at %.0f%% (the rest interpolated)" % (len(th), 100 * have_r.mean(), 100 * have_y.mean()), "",
         "| sector | radius from model | height from model | crest radius minus measured wall (m): median, 5th to 95th | crest height (m): median, 5th to 95th | largest radius step per 0.25 deg (m) | largest height step (m) |", "|---|---|---|---|---|---|---|"]
for lo5 in range(-45, 45, 5):
    m = (th >= lo5) & (th < lo5 + 5)
    lines.append("| %+d to %+d | %.0f%% | %.0f%% | %+.2f (%+.2f to %+.2f) | %.2f (%.2f to %.2f) | %.2f | %.2f |" % (lo5, lo5 + 5, 100 * have_r[m].mean(), 100 * have_y[m].mean(), np.median((r_s - dm)[m]), *np.percentile((r_s - dm)[m], [5, 95]),
                 np.median(y_s[m]), *np.percentile(y_s[m], [5, 95]), np.abs(np.diff(r_s[m])).max(), np.abs(np.diff(y_s[m])).max()))
lines += ["", "whole band: radius step per 0.25 degree 99th percentile %.2f m, maximum %.2f m; height step 99th percentile %.2f m, maximum %.2f m" % (np.percentile(np.abs(np.diff(r_s)), 99), np.abs(np.diff(r_s)).max(), np.percentile(np.abs(np.diff(y_s)), 99), np.abs(np.diff(y_s)).max())]
open(ROOT + "science/wall_crest.md", "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("\n".join(lines))
