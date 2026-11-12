// /api/note (11 Nov 2026, Andrew: yes to "a something's broken box"): POST { text, where } keeps a friend's note in the WITNESS KV under n:<time>:<who>, for Andrew
// to read with ops/notes.mjs. Behind the token gate (functions/_middleware.js). Up to 1,500 characters a note and 30 notes a friend a day.
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
import { whoIs } from '../../lib/auth.js'
async function who(request, env) {
  const w = await whoIs(request, env); if (!w) return null
  const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nn-witness:user:' + w.name)))].slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('')
  return { name: w.user.display ?? w.name, id: h }
}
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ error: 'POST' }, 405)
  if (!env.WITNESS) return json({ error: 'not set up' }, 404)
  const w = await who(request, env); if (!w) return json({ error: 'no token' }, 403)
  let body; try { body = JSON.parse((await request.text()).slice(0, 8000)) } catch { return json({ error: 'not json' }, 400) }
  const text = String(body?.text ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, 1500)
  if (!text) return json({ error: 'empty' }, 400)
  const day = new Date().toISOString().slice(0, 10), ck = `nc:${day}:${w.id}`, n = Number((await env.WITNESS.get(ck)) ?? 0)
  if (n >= 30) return json({ error: 'that is a lot of notes for one day' }, 429)
  await env.WITNESS.put(ck, String(n + 1), { expirationTtl: 2 * 86400 })
  const at = new Date().toISOString()
  await env.WITNESS.put(`n:${at}:${w.id}`, JSON.stringify({ at, name: w.name, text, where: String(body?.where ?? '').slice(0, 200), ua: (request.headers.get('user-agent') ?? '').slice(0, 200) }))
  return json({ ok: true })
}
