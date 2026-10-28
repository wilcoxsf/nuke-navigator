"""A McCovey Cove kayak with its paddler as a voxel model, for Study 25 (Andrew, 28 Oct: "use blender to make significantly better kayaks"; the landing pieces are
"real 3D pixel graphics", so the kayak is voxels too). The parts are modeled smooth (a lofted hull, a seat, a paddler in a life vest and a black and orange cap, a double
paddle), then voxelized onto one shared grid: a voxel takes the color of the first part whose surface it is inside. Only the cube faces that touch empty space are kept.
Writes apps/web/public/models/kayak.glb (x is the kayak's length, y up; about 5.2 m long). Run headless:
  blender --background --python science/blender/build_kayak.py
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT = "C:/Users/andrewwi/dev/nuke-navigator-new/apps/web/public/models/kayak.glb"
VOX = 0.11  # voxel edge, m
L, W, D = 5.2, 0.86, 0.36  # hull length, width, depth

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene


def hull_mesh():
    """lofted hull: elliptical sections, pointed ends, a slightly domed deck"""
    bm = bmesh.new()
    n, m = 40, 24
    rings = []
    for i in range(n + 1):
        u = i / n
        x = (u - 0.5) * L
        s = max(0.0, 1 - (2 * u - 1) ** 2) ** 0.62  # width falls to points at both ends
        w, d = W / 2 * s + 0.004, D * (0.35 + 0.65 * s) + 0.004
        ring = []
        for j in range(m):
            a = 2 * math.pi * j / m
            y = math.cos(a) * w
            z = math.sin(a) * (d if math.sin(a) < 0 else d * 0.45)  # deep below, shallow dome above
            ring.append(bm.verts.new((x, y, z + D)))
        rings.append(ring)
    for i in range(n):
        for j in range(m):
            bm.faces.new((rings[i][j], rings[i][(j + 1) % m], rings[i + 1][(j + 1) % m], rings[i + 1][j]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)  # outward, so the inside test works
    me = bpy.data.meshes.new("hull")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("hull", me)
    scn.collection.objects.link(ob)
    return ob


def prim(kind, loc, scale, rot=(0, 0, 0), name="p"):
    if kind == "sphere":
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=loc, rotation=rot)
    elif kind == "cyl":
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.scale = scale
    ob.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)  # the BVH tree reads local coordinates, so local must equal world
    return ob


# the parts, in priority order (a voxel inside two parts takes the first one's color); colors are sRGB hex. Voxel art needs chunky parts: arms, paddle and cap
# are drawn thicker than life so they survive at one voxel per 11 cm
parts = []
hull = hull_mesh()
deck = D + 0.16  # the top of the deck's dome
cz = deck  # the paddler sits at the deck
parts.append((prim("cube", (0, 0, deck + 0.01), (L * 0.40, 0.09, 0.06), name="stripe"), "#efe9dc"))
parts.append((prim("cyl", (0.35, 0, deck + 0.04), (0.46, 0.34, 0.07), name="rim"), "#1d1d1f"))
parts.append((prim("sphere", (0.33, 0, cz + 1.12), (0.20, 0.20, 0.11), name="cap"), "#111111"))
parts.append((prim("cube", (0.55, 0, cz + 1.07), (0.14, 0.15, 0.04), name="brim"), "#f26b21"))
parts.append((prim("sphere", (0.36, 0, cz + 0.98), (0.17, 0.17, 0.18), name="head"), "#e0b48a"))
parts.append((prim("cyl", (0.35, 0, cz + 0.62), (0.23, 0.26, 0.17), name="vest"), "#f2bc40"))
for side in (-1, 1):  # arms reach forward and up to the paddle
    parts.append((prim("cyl", (0.62, side * 0.27, cz + 0.60), (0.09, 0.09, 0.30), rot=(0, math.radians(62), side * math.radians(-12)), name="arm"), "#f26b21"))
parts.append((prim("cyl", (0.35, 0, cz + 0.25), (0.20, 0.23, 0.22), name="torso"), "#f26b21"))
parts.append((prim("cyl", (0.82, 0, cz + 0.72), (0.07, 0.07, 1.30), rot=(math.radians(90), math.radians(18), 0), name="shaft"), "#9aa0aa"))
for side in (-1, 1):  # the paddle's blades, tilted with the shaft
    parts.append((prim("cube", (0.82, side * 1.30, cz + 0.72 + side * 0.42), (0.08, 0.13, 0.30), rot=(math.radians(-18 * side), 0, 0), name="blade"), "#111111"))
parts.append((hull, "#e4002b"))

# ---- voxelize: inside test by the nearest surface point and its normal ----
trees = []
for ob, col in parts:
    dg = bpy.context.evaluated_depsgraph_get()
    trees.append((BVHTree.FromObject(ob, dg), col))
mins = Vector((-L / 2 - 0.1, -1.7, 0.0))
maxs = Vector((L / 2 + 0.1, 1.7, cz + 1.4))
nx, ny, nz = (int(math.ceil((maxs[i] - mins[i]) / VOX)) for i in range(3))
grid = {}
for i in range(nx):
    for j in range(ny):
        for k in range(nz):
            p = Vector((mins.x + (i + 0.5) * VOX, mins.y + (j + 0.5) * VOX, mins.z + (k + 0.5) * VOX))
            for tree, col in trees:
                hit = tree.find_nearest(p)
                if hit[0] is not None and (p - hit[0]).dot(hit[1]) < 0 and hit[3] < 0.6:
                    grid[(i, j, k)] = col
                    break
print("voxels", len(grid), "grid", nx, ny, nz, {c: sum(1 for v in grid.values() if v == c) for c in set(grid.values())})

# ---- one mesh of the outer cube faces, a material per color ----
for ob, _ in parts:
    bpy.data.objects.remove(ob, do_unlink=True)
cols = sorted(set(grid.values()))
mats = []
for c in cols:
    m = bpy.data.materials.new(c)
    r, g, b = (int(c[k:k + 2], 16) / 255 for k in (1, 3, 5))
    lin = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    m.use_nodes = True
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (lin(r), lin(g), lin(b), 1)
    m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
    mats.append(m)
bm = bmesh.new()
vmap = {}
def V(x, y, z):
    key = (x, y, z)
    if key not in vmap:
        vmap[key] = bm.verts.new((mins.x + x * VOX, mins.y + y * VOX, mins.z + z * VOX))
    return vmap[key]
FACES = [((1, 0, 0), [(1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)]), ((-1, 0, 0), [(0, 0, 0), (0, 0, 1), (0, 1, 1), (0, 1, 0)]),
         ((0, 1, 0), [(0, 1, 0), (0, 1, 1), (1, 1, 1), (1, 1, 0)]), ((0, -1, 0), [(0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)]),
         ((0, 0, 1), [(0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)]), ((0, 0, -1), [(0, 0, 0), (0, 1, 0), (1, 1, 0), (1, 0, 0)])]
nf = 0
for (i, j, k), c in grid.items():
    for (dx, dy, dz), corners in FACES:
        if (i + dx, j + dy, k + dz) in grid:
            continue
        f = bm.faces.new([V(i + a, j + b, k + cc) for a, b, cc in corners])
        f.material_index = cols.index(c)
        nf += 1
me = bpy.data.meshes.new("kayak")
bm.to_mesh(me)
bm.free()
ob = bpy.data.objects.new("kayak", me)
for m in mats:
    me.materials.append(m)
scn.collection.objects.link(ob)
print("faces", nf, "colors", cols)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
ob.select_set(True)
bpy.context.view_layer.objects.active = ob
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_yup=True)
print("wrote", OUT, os.path.getsize(OUT))
sys.exit(0)
