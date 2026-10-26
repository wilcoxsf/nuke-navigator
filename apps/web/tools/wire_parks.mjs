// Wire-only slim GLBs for the other 29 parks, registered into the Oracle scene frame (home plate at (0.3, 1.0), centre field -z, metres), for the wireframe view
// at ?park=TEAM. Same slimming as tools/wire_glb.mjs (positions and indices only: weld, simplify, quantize); before slimming, the model's root nodes are put under one node
// carrying the registration matrix from science/park_register.py (data/derived/parks/register/<TEAM>.json), so the park sits where Oracle sits.
// Source models and outputs are private (MLB-derived, git-ignored): data/raw/drive/park_glbs/Stadium_<TEAM>.glb -> apps/web/public/parks/<TEAM>/wire.glb
// One park at a time, and it waits while free memory is under 3 GB (another heavy job may be running).
// Usage (from apps/web): node tools/wire_parks.mjs [TEAM ...] [--ratio 0.35]
import { NodeIO, PropertyType } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { weld, simplify, quantize, prune, dedup } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import { statSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { freemem } from 'node:os'

const ROOT = 'C:/Users/andrewwi/dev/nuke-navigator-new/'
const args = process.argv.slice(2)
const ri = args.indexOf('--ratio')
const ratio = ri >= 0 ? Number(args.splice(ri, 2)[1]) : 0.35
const ALL = ['ARI', 'ATH', 'ATL', 'BAL', 'BOS', 'CHC', 'CIN', 'CLE', 'COL', 'CWS', 'DET', 'HOU', 'KC', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN', 'NYM', 'NYY', 'PHI', 'PIT', 'SD', 'SEA', 'STL', 'TB', 'TEX', 'TOR', 'WSH']
const teams = args.length ? args : ALL
await MeshoptSimplifier.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

for (const team of teams) {
  while (freemem() < 3e9) { console.log(`${team}: waiting, free memory ${(freemem() / 1e9).toFixed(1)} GB`); await sleep(30000) }
  const t0 = Date.now()
  const input = `${ROOT}data/raw/drive/park_glbs/Stadium_${team}.glb`, regPath = `${ROOT}data/derived/parks/register/${team}.json`
  if (!existsSync(regPath)) { console.log(`${team}: no registration, skipped`); continue }
  const reg = JSON.parse(readFileSync(regPath, 'utf8'))
  const M = reg.matrix // row-major 4x4, raw model world -> scene
  const doc = await io.read(input)
  const tris = () => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0)
  const before = tris()
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) for (const sem of prim.listSemantics()) if (sem !== 'POSITION') prim.setAttribute(sem, null)
  for (const mat of doc.getRoot().listMaterials()) { mat.setBaseColorTexture(null); mat.setNormalTexture(null); mat.setOcclusionTexture(null); mat.setEmissiveTexture(null); mat.setMetallicRoughnessTexture(null) }
  // drop lights and cameras some models carry; keep only nodes that lead to meshes
  const scene = doc.getRoot().listScenes()[0]
  const reg0 = doc.createNode('registration').setMatrix([M[0][0], M[1][0], M[2][0], 0, M[0][1], M[1][1], M[2][1], 0, M[0][2], M[1][2], M[2][2], 0, M[0][3], M[1][3], M[2][3], 1]) // glTF matrices are column-major
  const hasMesh = (n) => !!n.getMesh() || n.listChildren().some(hasMesh)
  for (const n of [...scene.listChildren()]) { scene.removeChild(n); if (hasMesh(n)) reg0.addChild(n) }
  scene.addChild(reg0)
  await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002 }), quantize({ quantizePosition: 14 }), dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE] }), prune()) // materials are NOT deduplicated: with textures gone they all look alike, but the wire view sorts edges by material name (structure = *_Greyscale)
  mkdirSync(`${ROOT}apps/web/public/parks/${team}`, { recursive: true })
  const output = `${ROOT}apps/web/public/parks/${team}/wire.glb`
  await io.write(output, doc)
  console.log(`${team}: ${Math.round(before)} -> ${Math.round(tris())} triangles, ${(statSync(input).size / 1e6).toFixed(1)} MB -> ${(statSync(output).size / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(1)} s`)
}
