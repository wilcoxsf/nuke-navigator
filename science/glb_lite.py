"""Minimal GLB reader for the park models: triangles per material in world coordinates (node transforms applied), nothing else decoded (no textures, no UVs),
so a 90 MB park costs tens of MB of memory instead of the gigabyte trimesh needs. Handles float/normalized-int POSITION accessors and the node hierarchy.
Usage (library): tris_by_material(path) -> {material_name: (n,3,3) float32 array in metres}"""
from __future__ import annotations

import json
import struct

import numpy as np

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def read(path: str):
    with open(path, "rb") as f:
        data = f.read()
    magic, _ver, _len = struct.unpack_from("<4sII", data, 0)
    assert magic == b"glTF", path
    off, gj, binc = 12, None, None
    while off < len(data):
        clen, ctype = struct.unpack_from("<I4s", data, off)
        chunk = memoryview(data)[off + 8:off + 8 + clen]
        if ctype == b"JSON":
            gj = json.loads(bytes(chunk))
        elif ctype == b"BIN\x00":
            binc = chunk
        off += 8 + clen
    return gj, binc


def accessor(gj, binc, i):
    a = gj["accessors"][i]
    bv = gj["bufferViews"][a["bufferView"]]
    dt = np.dtype(CT[a["componentType"]])
    nc = NC[a["type"]]
    start = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = bv.get("byteStride", 0) or dt.itemsize * nc
    cnt = a["count"]
    raw = np.frombuffer(binc, np.uint8, count=stride * (cnt - 1) + dt.itemsize * nc, offset=start)
    if stride == dt.itemsize * nc:
        arr = raw.view(dt).reshape(cnt, nc).copy()
    else:
        arr = np.lib.stride_tricks.as_strided(raw, (cnt, nc * dt.itemsize), (stride, 1)).copy().view(dt).reshape(cnt, nc)
    if a.get("normalized") and dt.kind in "iu":
        arr = arr.astype(np.float32) / np.iinfo(dt).max
        if dt.kind == "i":
            arr = np.maximum(arr, -1.0)
    return arr


def node_matrix(n):
    if "matrix" in n:
        return np.array(n["matrix"], float).reshape(4, 4).T
    t = np.array(n.get("translation", [0, 0, 0]), float)
    q = np.array(n.get("rotation", [0, 0, 0, 1]), float)
    s = np.array(n.get("scale", [1, 1, 1]), float)
    x, y, z, w = q
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4)
    M[:3, :3] = R * s[None, :]
    M[:3, 3] = t
    return M


def tris_by_material(path: str, want=None) -> dict:
    gj, binc = read(path)
    out: dict = {}
    scene = gj["scenes"][gj.get("scene", 0)]

    def walk(ni, parent):
        n = gj["nodes"][ni]
        M = parent @ node_matrix(n)
        if "mesh" in n:
            for p in gj["meshes"][n["mesh"]]["primitives"]:
                mat = gj["materials"][p["material"]]["name"] if "material" in p else ""
                if want is not None and not want(mat):
                    continue
                if p.get("mode", 4) != 4:
                    continue
                V = accessor(gj, binc, p["attributes"]["POSITION"]).astype(np.float64)
                V = V @ M[:3, :3].T + M[:3, 3]
                I = accessor(gj, binc, p["indices"]).reshape(-1).astype(np.int64) if "indices" in p else np.arange(len(V))
                T = V[I.reshape(-1, 3)].astype(np.float32)
                out.setdefault(mat, []).append(T)
        for c in n.get("children", []):
            walk(c, M)

    for ni in scene["nodes"]:
        walk(ni, np.eye(4))
    return {k: np.concatenate(v) for k, v in out.items()}


def info(path: str) -> dict:
    gj, _ = read(path)
    return {"extensions": gj.get("extensionsUsed", []), "nodes": [{k: v for k, v in n.items() if k != "children"} for n in gj["nodes"]],
            "materials": [m.get("name") for m in gj.get("materials", [])]}


if __name__ == "__main__":
    import sys
    for p in sys.argv[1:]:
        print(p.split("/")[-1], info(p))
        T = tris_by_material(p)
        for k, v in T.items():
            P = v.reshape(-1, 3)
            print("  %-22s tris %7d  min %s  max %s" % (k, len(v), P.min(0).round(1), P.max(0).round(1)))
