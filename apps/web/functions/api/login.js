// POST /api/login { name, password }: a session cookie, and { must } when the password is still the one Andrew gave (11 Nov 2026; lib/auth.js)
import { checkPw, newSession, cookie, tooMany, missed, cleanLogin } from '../../lib/auth.js'
const json = (b, s = 200, h = {}) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...h } })
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ error: 'POST' }, 405)
  let b; try { b = JSON.parse((await request.text()).slice(0, 2000)) } catch { return json({ error: 'NOT JSON' }, 400) }
  const name = cleanLogin(b?.name)
  if (!name || !b?.password) return json({ error: 'NAME AND PASSWORD' }, 400)
  if (await tooMany(env, name)) return json({ error: 'TOO MANY TRIES. WAIT AN HOUR.' }, 429)
  const u = await checkPw(env, name, String(b.password))
  if (!u) { await missed(env, name); return json({ error: 'THAT NAME AND PASSWORD DO NOT MATCH' }, 401) }
  const sid = await newSession(env, name)
  return json({ ok: true, must: !!u.must }, 200, { 'Set-Cookie': cookie(sid) })
}
