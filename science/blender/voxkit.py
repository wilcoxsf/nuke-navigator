"""Shared Blender helpers for Study 25's voxel models (the kayak, the glove, the sea lion, the ball): smooth parts made from primitives or lofts, then voxelized onto
one grid (a voxel takes the color of the first part whose surface it is inside), keeping only the cube faces that touch empty space, with one flat material per
color, exported as GLB (y up). Each part's transforms are applied, because the BVH tree used for the inside test reads local coordinates.
"""
import math
import os

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def prim(kind, loc, scale, rot=(0, 0, 0), name="p"):
    if kind == "sphere":
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=14, location=loc, rotation=rot)
    elif kind == "cyl":
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, location=loc, rotation=rot)
    elif kind == "cone":
        bpy.ops.mesh.primitive_cone_add(vertices=24, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.scale = scale
    ob.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return ob


def lin(v):
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def voxelize(parts, vox, lo, hi, out, max_depth=0.6):
    """parts: [(object, '#rrggbb')] in priority order; lo, hi: the grid's corners (Blender coordinates, z up). Removes the parts, writes the GLB, returns counts."""
    trees = []
    dg = bpy.context.evaluated_depsgraph_get()
    for ob, col in parts:
        trees.append((BVHTree.FromObject(ob, dg), col))
    lo, hi = Vector(lo), Vector(hi)
    n = [int(math.ceil((hi[i] - lo[i]) / vox)) for i in range(3)]
    grid = {}
    for i in range(n[0]):
        for j in range(n[1]):
            for k in range(n[2]):
                p = Vector((lo.x + (i + 0.5) * vox, lo.y + (j + 0.5) * vox, lo.z + (k + 0.5) * vox))
                for tree, col in trees:
                    hit = tree.find_nearest(p)
                    if hit[0] is not None and (p - hit[0]).dot(hit[1]) < 0 and hit[3] < max_depth:
                        grid[(i, j, k)] = col
                        break
    for ob, _ in parts:
        bpy.data.objects.remove(ob, do_unlink=True)
    cols = sorted(set(grid.values()))
    mats = []
    for c in cols:
        m = bpy.data.materials.new(c)
        m.use_nodes = True
        r, g, b = (int(c[q:q + 2], 16) / 255 for q in (1, 3, 5))
        m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (lin(r), lin(g), lin(b), 1)
        m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
        mats.append(m)
    bm = bmesh.new()
    vmap = {}

    def V(x, y, z):
        key = (x, y, z)
        if key not in vmap:
            vmap[key] = bm.verts.new((lo.x + x * vox, lo.y + y * vox, lo.z + z * vox))
        return vmap[key]

    FACES = [((1, 0, 0), [(1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)]), ((-1, 0, 0), [(0, 0, 0), (0, 0, 1), (0, 1, 1), (0, 1, 0)]),
             ((0, 1, 0), [(0, 1, 0), (0, 1, 1), (1, 1, 1), (1, 1, 0)]), ((0, -1, 0), [(0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)]),
             ((0, 0, 1), [(0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)]), ((0, 0, -1), [(0, 0, 0), (0, 1, 0), (1, 1, 0), (1, 0, 0)])]
    for (i, j, k), c in grid.items():
        for (dx, dy, dz), corners in FACES:
            if (i + dx, j + dy, k + dz) in grid:
                continue
            f = bm.faces.new([V(i + a, j + b, k + cc) for a, b, cc in corners])
            f.material_index = cols.index(c)
    name = os.path.splitext(os.path.basename(out))[0]
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    for m in mats:
        me.materials.append(m)
    bpy.context.scene.collection.objects.link(ob)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_yup=True)
    bpy.data.objects.remove(ob, do_unlink=True)
    counts = {c: sum(1 for v in grid.values() if v == c) for c in cols}
    print("wrote", out, os.path.getsize(out), "voxels", len(grid), counts)
    return counts
