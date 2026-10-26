// The what-if odds model in the page: boosted trees over what a swing knows once its landing bearing is set (science/whatif_model.py writes public/whatif_model.json;
// the export is checked against LightGBM's own scores there). Inputs: ev, la, bear (landing bearing), hand (1 right, -1 left), temp (F), elev (ft), fence and wallh (ft at that bearing).
let model = null
export async function loadWhatIf() {
  if (model) return model
  try { const r = await fetch('/whatif_model.json'); model = r.ok ? await r.json() : null } catch { model = null }
  return model
}
export function whatIfP(m, x) {
  if (!m) return null
  const v = m.feats.map((k) => x[k])
  let z = m.base ?? 0
  for (const t of m.trees) {
    let n = 0
    while (t.f[n] !== -1) n = v[t.f[n]] <= t.t[n] ? t.l[n] : t.r[n]
    z += t.v[n]
  }
  return 1 / (1 + Math.exp(-z))
}
