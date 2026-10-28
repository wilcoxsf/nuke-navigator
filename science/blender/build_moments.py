"""Study 25's landing pieces as voxel models (Andrew, 28 Oct: "I also want the ball landing things to be real 3D pixel graphics"), built in Blender with voxkit:
  glove_open, glove_shut (a fielder's glove, fingers up; then closed round a ball)    sealion_shut, sealion_open (a sea lion up out of the Cove, mouth shut or open)
  ball (a baseball, white with red seams)
Real-world sizes in meters; the page scales them up so they read at 400 ft. Writes apps/web/public/models/*.glb. Run headless:
  blender --background --python science/blender/build_moments.py
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voxkit as K  # noqa: E402

OUT = "C:/Users/andrewwi/dev/nuke-navigator-new/apps/web/public/models/"
LEATHER, LACE, POCKET, WHITE, RED = "#b07a43", "#e3c08a", "#7e5530", "#f1ece0", "#d0202a"


def glove(shut):
    """a glove standing up, palm toward -y (the camera), about 0.32 m tall; shut: the fingers fold over a ball in the pocket"""
    K.reset()
    parts = []
    if shut:
        parts.append((K.prim("sphere", (0, -0.06, 0.15), (0.045, 0.045, 0.045), name="ball"), WHITE))
        parts.append((K.prim("cyl", (0, -0.035, 0.15), (0.047, 0.047, 0.006), rot=(math.radians(90), 0, math.radians(30)), name="seam"), RED))
        # the fingers closed forward over the ball: one rounded cap over the top of the pocket
        parts.append((K.prim("sphere", (0, -0.06, 0.225), (0.115, 0.075, 0.07), name="fingers"), LEATHER))
        parts.append((K.prim("sphere", (-0.10, -0.05, 0.13), (0.035, 0.035, 0.06), name="thumb"), LEATHER))
    else:
        parts.append((K.prim("sphere", (0, -0.035, 0.14), (0.08, 0.02, 0.08), name="pocket"), POCKET))
        for k, x in enumerate((-0.075, -0.025, 0.025, 0.072)):
            h = (0.10, 0.12, 0.115, 0.095)[k]
            parts.append((K.prim("cyl", (x, -0.01, 0.20 + h / 2), (0.024, 0.022, h / 2 + 0.02), name="finger"), LEATHER))
            parts.append((K.prim("cyl", (x, -0.012, 0.20 + h / 2), (0.006, 0.026, h / 2), name="lace"), LACE))
        parts.append((K.prim("cyl", (-0.14, -0.01, 0.18), (0.028, 0.026, 0.08), rot=(0, math.radians(-35), 0), name="thumb"), LEATHER))
        parts.append((K.prim("cube", (-0.11, -0.01, 0.24), (0.035, 0.012, 0.05), name="web"), LACE))
    parts.append((K.prim("sphere", (0, 0, 0.13), (0.12, 0.05, 0.13), name="palm"), LEATHER))
    parts.append((K.prim("cyl", (0, 0, 0.01), (0.075, 0.05, 0.03), name="cuff"), LACE))
    return K.voxelize(parts, 0.016, (-0.22, -0.12, -0.03), (0.16, 0.08, 0.36), OUT + ("glove_shut.glb" if shut else "glove_open.glb"))


def sealion(open_):
    """a sea lion rearing up out of the water (the water is z = 0), facing -y, snout tipped up; open: the jaws part to snap the ball. Light browns, so it shows on the black sea"""
    K.reset()
    BODY, DARK, BELLY, NOSE = "#9a7454", "#6a4e38", "#c9a27a", "#141414"
    parts = []
    for s in (-1, 1):
        parts.append((K.prim("sphere", (s * 0.075, -0.235, 1.17), (0.035, 0.03, 0.035), name="eye"), NOSE))
    parts.append((K.prim("sphere", (0, -0.43, 1.20), (0.04, 0.035, 0.035), name="nose"), NOSE))
    if open_:
        parts.append((K.prim("sphere", (0, -0.33, 1.20), (0.075, 0.13, 0.045), rot=(math.radians(-30), 0, 0), name="upper"), BODY))
        parts.append((K.prim("sphere", (0, -0.30, 1.03), (0.065, 0.12, 0.035), rot=(math.radians(15), 0, 0), name="lower"), BODY))
        parts.append((K.prim("sphere", (0, -0.28, 1.11), (0.055, 0.10, 0.045), name="mouth"), "#d0707a"))
    else:
        parts.append((K.prim("sphere", (0, -0.32, 1.14), (0.08, 0.14, 0.07), rot=(math.radians(-15), 0, 0), name="snout"), BODY))
    parts.append((K.prim("sphere", (0, -0.13, 1.12), (0.17, 0.17, 0.16), name="head"), BODY))
    parts.append((K.prim("sphere", (0, -0.20, 0.45), (0.20, 0.10, 0.30), name="belly"), BELLY))
    for s in (-1, 1):
        parts.append((K.prim("sphere", (s * 0.34, -0.10, 0.40), (0.22, 0.06, 0.09), rot=(0, math.radians(s * -30), 0), name="flipper"), DARK))
    parts.append((K.prim("sphere", (0, -0.06, 0.82), (0.20, 0.19, 0.32), rot=(math.radians(-12), 0, 0), name="neck"), BODY))
    parts.append((K.prim("sphere", (0, 0.02, 0.28), (0.32, 0.27, 0.50), name="body"), BODY))
    return K.voxelize(parts, 0.055, (-0.6, -0.55, -0.05), (0.6, 0.4, 1.40), OUT + ("sealion_open.glb" if open_ else "sealion_shut.glb"))


def ball():
    K.reset()
    parts = [(K.prim("cyl", (0, 0, 0), (0.0375, 0.0375, 0.005), rot=(math.radians(70), 0, math.radians(20)), name="seam"), RED),
             (K.prim("sphere", (0, 0, 0), (0.0365, 0.0365, 0.0365), name="ball"), WHITE)]
    return K.voxelize(parts, 0.009, (-0.045, -0.045, -0.045), (0.045, 0.045, 0.045), OUT + "ball.glb")


glove(False)
glove(True)
sealion(False)
sealion(True)
ball()
sys.exit(0)
