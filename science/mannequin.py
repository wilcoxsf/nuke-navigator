"""A shaded, anatomically proportioned baseball batter for the ASCII art (25 Oct 2026). The old generic batter was a handful of capsules; this one is a posed 3D mannequin (oriented ellipsoids and tapered sphere chains: helmet with ear flap and bill, neck, trapezius,
chest, waist, pelvis, thigh and calf with a calf bulge, cleats, sleeves over bare forearms, batting gloves, a tapered bat with a knob) lit from upper left with a rim light, rendered by an orthographic ray cast into a tone map and a mask. The tone map goes to the same art.js
converter as the headshots (bright = ink), so every style in the app can draw it.
Skeleton: joints in centimetres, x toward the pitcher (screen right), y up, z toward the camera. A right-handed batter stands on the left of a camera that looks at the plate, chest facing the camera at yaw 0. Left-handers mirror in the page.
Two-bone IK puts knees and elbows where a human puts them. Usage: python science/mannequin.py [--view 35] [--h 720] [--out apps/web/public/batter_tone.json]"""
import argparse
import base64
import json

import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("--view", type=float, default=35.0, help="camera yaw in degrees (0: looking at the chest, 90: looking at the batter's side)")
ap.add_argument("--h", type=int, default=720)
ap.add_argument("--out", default="C:/Users/andrewwi/dev/nuke-navigator-new/apps/web/public/batter_tone.json")
ap.add_argument("--only", default="")
a, _ = ap.parse_known_args()

# ---------------------------------------------------------------------------------------------------------------- vector helpers
V = lambda *v: np.array(v, float)
UP = V(0, 1, 0)


def nrm(v):
    return v / (np.linalg.norm(v) + 1e-9)


def face(yaw, pitch=0.0):  # direction a body part faces; yaw 0 faces the camera (+z), positive yaw turns toward the pitcher (+x)
    y, p = np.radians(yaw), np.radians(pitch)
    return V(np.sin(y) * np.cos(p), -np.sin(p), np.cos(y) * np.cos(p))


def lat_left(yaw):  # the batter's left (toward the pitcher at yaw 0)
    y = np.radians(yaw)
    return V(np.cos(y), 0, -np.sin(y))


def ik(root, target, l1, l2, pole):
    """two-bone IK: the middle joint between root and target, bent toward the pole direction"""
    d = target - root
    dist = np.clip(np.linalg.norm(d), 1e-3, l1 + l2 - 0.5)
    dn = d / np.linalg.norm(d)
    ca = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)
    ang = np.arccos(np.clip(ca, -1, 1))
    pp = pole - dn * np.dot(pole, dn)
    pp = nrm(pp)
    mid = root + dn * (l1 * np.cos(ang)) + pp * (l1 * np.sin(ang))
    end = root + dn * dist
    return mid, end


# ---------------------------------------------------------------------------------------------------------------- primitives
class Scene:
    def __init__(self):
        self.prims = []  # (center, rx, ry, rz, R (local axes as columns), albedo, shine)

    def ell(self, c, radii, axes=None, albedo=0.7, spec=0.0):
        R = np.eye(3) if axes is None else axes
        self.prims.append((np.array(c, float), np.array(radii, float), R, albedo, spec))

    def chain(self, p0, p1, r0, r1, albedo=0.7, n=None, bulge=0.0, flat=1.0, spec=0.0):
        """a tapered limb: spheres along p0..p1 (r0 to r1), optional mid bulge; flat < 1 squashes the depth axis"""
        L = np.linalg.norm(p1 - p0)
        n = n or max(6, int(L / 0.6))
        for t in np.linspace(0, 1, n):
            r = r0 + (r1 - r0) * t + bulge * np.sin(np.pi * t)
            self.ell(p0 + (p1 - p0) * t, (r, r, r * flat), None, albedo, spec)

    def oriented(self, c, axis, half, r_perp, r_other=None, albedo=0.7, spec=0.0):
        """an ellipsoid long along `axis` (half-length `half`), round r_perp across (r_other in the second perpendicular direction)"""
        ax = nrm(axis)
        t = nrm(np.cross(ax, V(0, 0, 1))) if abs(ax[2]) < 0.95 else nrm(np.cross(ax, V(1, 0, 0)))
        u = np.cross(ax, t)
        self.ell(c, (half, r_perp, r_other or r_perp), np.stack([ax, t, u], axis=1), albedo, spec)


def render(scene, W, Hpx, scale, cx, gy, light):
    """orthographic: x to the right, y up, camera looking down -z. Returns tone (0..1) and mask (0/1)"""
    zbuf = np.full((Hpx, W), -1e9)
    alb = np.zeros((Hpx, W))
    nz = np.zeros((Hpx, W, 3))
    spec = np.zeros((Hpx, W))
    for c, rad, R, al, sp in scene.prims:
        # bounding box in pixels from the largest radius
        rr = rad.max()
        x0, x1 = int((c[0] - rr) * scale + cx) - 1, int((c[0] + rr) * scale + cx) + 2
        y0, y1 = int(gy - (c[1] + rr) * scale) - 1, int(gy - (c[1] - rr) * scale) + 2
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, Hpx)
        if x1 <= x0 or y1 <= y0:
            continue
        xs = (np.arange(x0, x1) + 0.5 - cx) / scale
        ys = (gy - (np.arange(y0, y1) + 0.5)) / scale
        X, Y = np.meshgrid(xs, ys)
        Ainv = np.diag(1 / rad) @ R.T  # local unit-sphere coordinates u = Ainv (q - c)
        a0, a1, a2 = Ainv[:, 0], Ainv[:, 1], Ainv[:, 2]
        qa = a2 @ a2
        dx, dy = X - c[0], Y - c[1]
        b = 2 * (dx * (a0 @ a2) + dy * (a1 @ a2))
        cc = (dx * dx) * (a0 @ a0) + (dy * dy) * (a1 @ a1) + 2 * dx * dy * (a0 @ a1) - 1
        disc = b * b - 4 * qa * cc
        hit = disc > 0
        if not hit.any():
            continue
        s = (-b + np.sqrt(np.where(hit, disc, 0))) / (2 * qa)  # the root nearer the camera (larger z)
        z = c[2] + s
        sub = zbuf[y0:y1, x0:x1]
        win = hit & (z > sub)
        if not win.any():
            continue
        # normal in world space: n ~ R diag(1/r^2) R^T (q - c) = Ainv^T u
        qx, qy, qz = dx, dy, s
        u = Ainv @ np.stack([qx, qy, qz]).reshape(3, -1)
        n = (Ainv.T @ u).T.reshape(dx.shape + (3,))
        n = n / (np.linalg.norm(n, axis=-1, keepdims=True) + 1e-9)
        sub[win] = z[win]
        alb[y0:y1, x0:x1][win] = al
        nz[y0:y1, x0:x1][win] = n[win]
        spec[y0:y1, x0:x1][win] = sp
    mask = zbuf > -1e8
    n = nz
    L1, L2 = nrm(light[0]), nrm(light[1])
    diff = np.clip((n * L1).sum(-1), 0, 1)
    fill = np.clip((n * L2).sum(-1), 0, 1)
    rim = np.clip(1 - n[..., 2], 0, 1) ** 2.2
    lit = 0.16 + 0.78 * diff + 0.18 * fill
    sh = (0.45 + 0.55 * alb) * lit + 0.38 * rim * (0.4 + 0.6 * alb) + spec * np.clip((n * nrm(L1 + V(0, 0, 1))).sum(-1), 0, 1) ** 24 * 0.6
    # cheap ambient occlusion: a surface that sits much deeper than its neighbours (armpit, between the legs) is darkened
    zb = np.where(mask, zbuf, np.nan)
    from scipy import ndimage as ndi
    zf = np.where(mask, zbuf, 0)
    m = ndi.uniform_filter(mask.astype(float), 9)
    zm = ndi.uniform_filter(zf, 9) / np.maximum(m, 1e-3)
    ao = np.clip((zm - zbuf) / (12 * scale), 0, 1)  # positive where the pixel is behind its surroundings
    sh = sh * (1 - 0.55 * ao)
    # ink lines for the contour styles: depth jumps (silhouette, one limb in front of another) and normal creases, two pixels thick
    zf2 = np.where(mask, zbuf, zbuf[mask].min() - 40 * scale / scale)
    gz = np.hypot(ndi.sobel(zf2, 0), ndi.sobel(zf2, 1)) / (8.0 * scale)  # cm of depth per pixel
    gn = sum(np.hypot(ndi.sobel(n[..., k], 0), ndi.sobel(n[..., k], 1)) for k in range(3)) / 8.0
    ink = np.maximum(np.clip((gz - 0.9) / 2.5, 0, 1), 0.85 * np.clip((gn - 0.30) / 0.55, 0, 1)) * ndi.binary_dilation(mask, iterations=2)
    ink = np.clip(ndi.maximum_filter(ink, 3), 0, 1)
    return np.clip(sh, 0, 1) * mask, mask, ink


# ---------------------------------------------------------------------------------------------------------------- the batter
SKIN, JERSEY, PANTS, SOCK, CLEAT, HELMET, GLOVE, BAT, TAPE, BELT = 0.62, 0.92, 0.70, 0.55, 0.30, 0.34, 0.85, 0.58, 0.25, 0.22


def batter(p):
    """build the scene for one pose dict. All lengths in cm, the batter is 188 cm tall"""
    S = Scene()
    P = V(*p["pelvis"])
    yp, ys, yh = p["pelvis_yaw"], p["sh_yaw"], p["head_yaw"]
    lean = np.radians(p["lean"])
    fp, fs = face(yp), face(ys)
    ymid = (yp + ys) / 2
    sdir = nrm(np.cos(lean) * UP + np.sin(lean) * face(ymid))  # spine direction
    waist = P + 17 * sdir
    chest = P + 39 * sdir
    neckb = P + 57 * sdir
    # torso: oriented ellipsoids (wide across the shoulders, shallow front to back)
    lat_p, lat_s = lat_left(yp), lat_left(ys)
    S.ell(P - 2 * UP, (17.5, 12, 11.5), np.stack([lat_p, UP, fp], axis=1), PANTS, 0.0)  # pelvis and seat
    # the torso as a loft of slices: half-width and depth along the spine (belt, waist, ribcage, chest, shoulder line), yaw blended from the hips to the shoulders
    prof = [(2, 16.6, 10.8, BELT), (7, 15.2, 10.0, JERSEY), (14, 14.4, 9.6, JERSEY), (22, 16.4, 10.6, JERSEY), (31, 19.2, 11.8, JERSEY), (40, 21.4, 12.2, JERSEY), (49, 22.4, 10.8, JERSEY), (55, 21.0, 8.4, JERSEY)]
    for (s0, w0, d0, al), (s1, w1, d1, _) in zip(prof[:-1], prof[1:]):
        for u in np.linspace(0, 1, 12):
            s_ = s0 + (s1 - s0) * u
            yw = yp + (ys - yp) * np.clip(s_ / 50.0, 0, 1)
            S.ell(P + s_ * sdir, (w0 + (w1 - w0) * u, 9.0, d0 + (d1 - d0) * u), np.stack([lat_left(yw), sdir, face(yw)], axis=1), al if s_ < 5 else JERSEY)
    S.chain(neckb - 4 * sdir, neckb + 11 * nrm(sdir + 0.3 * face(yh)), 6.4, 5.4, SKIN)  # neck
    # head and helmet
    H = neckb + 11 * nrm(sdir + 0.3 * face(yh)) + 10 * UP * 0.9 + 3 * face(yh)
    fh = face(yh, p.get("head_pitch", 0))
    lh = lat_left(yh)
    S.ell(H, (9.6, 12.2, 10.8), np.stack([lh, UP, fh], axis=1), SKIN, 0.1)  # skull
    S.ell(H + fh * 3.8 - UP * 6.4, (6.9, 7.2, 8.3), np.stack([lh, UP, fh], axis=1), SKIN, 0.1)  # jaw and face
    S.ell(H + fh * 9.6 - UP * 2.2, (1.6, 2.2, 2.3), np.stack([lh, UP, fh], axis=1), SKIN, 0.2)  # nose
    S.ell(H + UP * 3.4 - fh * 0.8, (11.8, 9.8, 12.6), np.stack([lh, UP, fh], axis=1), HELMET, 0.55)  # helmet shell
    S.ell(H + lh * 8.9 - UP * 1.5 - fh * 0.5, (2.0, 7.2, 8.0), np.stack([lh, UP, fh], axis=1), HELMET, 0.55)  # ear flap on the near side
    S.ell(H + fh * 9.4 + UP * 4.6, (7.6, 1.4, 6.0), np.stack([lh, UP, fh], axis=1), HELMET, 0.3)  # bill
    # legs: hip joints, ankles from the pose, knees by IK toward the front
    for side in ("R", "L"):
        sgn = 1 if side == "L" else -1
        hip = P + sgn * 10.5 * lat_p - 5 * UP
        ankle = V(*p["foot" + side])
        ankle = ankle.copy()
        ankle[1] += 9
        fd = face(p.get("footyaw" + side, 0))
        pole = nrm(face(yp) * 1.0 + sgn * lat_p * 0.25)
        knee, ank = ik(hip, ankle, 45, 43, pole)
        S.chain(hip, knee, 10.8, 7.2, PANTS, bulge=0.8)  # thigh
        S.chain(knee, ank, 6.9, 4.6, PANTS, bulge=1.3)  # calf
        S.chain(ank, ank - UP * 4, 4.6, 4.4, SOCK)  # sock
        pitch = p.get("footpitch" + side, 0)
        fdir = nrm(face(p.get("footyaw" + side, 0), -pitch))
        S.oriented(ank - UP * 6.0 + fdir * 5.5, fdir, 14.5, 5.4, 4.0, CLEAT, 0.5)  # cleat
    # arms
    shoulders = {}
    for side in ("R", "L"):
        sgn = 1 if side == "L" else -1
        sh = neckb + sgn * 19.5 * lat_s - 4.5 * UP - 1.5 * sdir
        shoulders[side] = sh
    grip = V(*p["grip"])
    batdir = nrm(V(np.cos(np.radians(p["bat_az"])) * np.cos(np.radians(p.get("bat_el", 0))), np.sin(np.radians(p["bat_az"])), np.cos(np.radians(p["bat_az"])) * np.sin(np.radians(p.get("bat_el", 0)))) if p.get("bat_vec") is None else np.array(p["bat_vec"], float))
    hands = {"R": grip - batdir * 0.0 if p.get("top", "R") == "R" else grip + batdir * 9, "L": grip + batdir * 9 if p.get("top", "R") == "R" else grip}
    for side in ("R", "L"):
        sgn = 1 if side == "L" else -1
        pole = nrm(-UP * 1.0 + sgn * lat_s * 0.55 - face(ys) * 0.1 + V(*p.get("elbow_pole", (0, 0, 0))))
        elb, hnd = ik(shoulders[side], hands[side], 29.5, 26.5, pole)
        S.chain(shoulders[side], elb, 6.6, 5.2, JERSEY, bulge=0.6)  # upper arm in a sleeve
        e2 = elb + nrm(hnd - elb) * 0.0
        S.chain(elb + nrm(hnd - elb) * 0.5, hnd, 5.0, 3.6, SKIN, bulge=0.7)  # forearm
        S.ell(hnd, (5.0, 5.0, 4.6), None, GLOVE, 0.2)  # batting glove
        S.ell(shoulders[side], (7.4, 7.4, 7.4), None, JERSEY)  # shoulder cap
    # bat: knob, handle with tape, barrel
    knob = grip - batdir * 6
    S.ell(knob, (2.8, 2.8, 2.8), None, TAPE, 0.3)
    S.chain(knob, knob + batdir * 28, 1.55, 1.7, TAPE, spec=0.1)
    S.chain(knob + batdir * 28, knob + batdir * 52, 1.7, 3.3, BAT, spec=0.55)
    S.chain(knob + batdir * 52, knob + batdir * 82, 3.3, 3.45, BAT, spec=0.55)
    S.ell(knob + batdir * 83.5, (3.2, 3.2, 3.2), None, BAT, 0.5)
    return S


# ---------------------------------------------------------------------------------------------------------------- poses (right-handed batter)
POSES = {
    # stance: wide, knees soft, the chest to the camera, the head turned to the pitcher, the bat upright behind the back shoulder
    "stance": dict(pelvis=(-1, 91, 0), pelvis_yaw=-4, sh_yaw=-10, head_yaw=82, lean=13, footR=(-31, 0, -2), footL=(31, 0, 2), footyawR=15, footyawL=-15,
                   grip=(-22, 154, 17), bat_az=104, bat_el=0, elbow_pole=(0, 0, 0.4)),
    # load: weight back, hands back, the front heel off the ground, the chest wound away from the pitcher
    "load": dict(pelvis=(-9, 90, 0), pelvis_yaw=-24, sh_yaw=-50, head_yaw=88, lean=10, footR=(-34, 0, -2), footL=(30, 16, 6), footyawR=22, footyawL=-35, footpitchL=45,
                 grip=(-36, 160, 12), bat_az=94, bat_el=0, elbow_pole=(0, 0, 0.5)),
    # contact: the front foot planted, hips open, the arms extended, the bat meeting the ball out front, the head down on it
    "contact": dict(pelvis=(3, 86, 0), pelvis_yaw=50, sh_yaw=30, head_yaw=70, head_pitch=22, lean=19, footR=(-27, 4, -3), footL=(55, 0, 8), footyawR=60, footyawL=-70, footpitchR=48,
                    grip=(26, 106, 30), bat_vec=(0.52, 0.30, 0.80), bat_az=0, elbow_pole=(0, 0.2, 0.3)),
    # follow-through: the hips and chest fully open, the bat wrapped around the front shoulder, weight on the front leg
    "follow": dict(pelvis=(8, 88, 0), pelvis_yaw=88, sh_yaw=78, head_yaw=60, lean=12, footR=(-24, 6, -4), footL=(58, 0, 6), footyawR=85, footyawL=-80, footpitchR=62,
                   grip=(-2, 170, 22), bat_vec=(-0.55, -0.45, 0.70), bat_az=0, top="L", elbow_pole=(0, 0.3, 0.4)),
}


def main():
    W, Hpx = int(a.h * 0.95), a.h
    scale = Hpx / 250.0  # px per cm: 250 cm fits the height
    cx, gy = W * 0.42, Hpx - 14
    beta = np.radians(a.view)
    Ry = np.array([[np.cos(beta), 0, np.sin(beta)], [0, 1, 0], [-np.sin(beta), 0, np.cos(beta)]])
    light = (V(-0.55, 0.70, 0.45), V(0.7, 0.15, 0.5))
    out = {}
    for name, p in POSES.items():
        if a.only and name not in a.only.split(","):
            continue
        S = batter(p)
        # camera yaw: rotate every primitive about the vertical axis through the pelvis
        pc = V(*p["pelvis"])
        S2 = Scene()
        for c, r, R, al, sp in S.prims:
            S2.prims.append((Ry @ (c - V(0, 0, 0)) , r, Ry @ R, al, sp))
        tone, mask, ink = render(S2, W, Hpx, scale, cx, gy, light)
        out[name] = {"w": W, "h": Hpx, "tone": base64.b64encode((np.clip(tone, 0, 1) * 255).astype(np.uint8).tobytes()).decode(), "mask": base64.b64encode((mask * 255).astype(np.uint8).tobytes()).decode(), "ink": base64.b64encode((np.clip(ink, 0, 1) * 255).astype(np.uint8).tobytes()).decode()}
        print(name, "ink fraction %.3f" % mask.mean(), "tone mean %.2f" % tone[mask].mean())
    json.dump({"view": a.view, "poses": out}, open(a.out, "w"))
    print("written", a.out)


if __name__ == "__main__":
    main()
