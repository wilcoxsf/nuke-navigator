// POST /api/password { password, old }: set your own password (8 to 200 characters). On the one Andrew gave you, no old one is needed (you just used it);
// after that the old one is (11 Nov 2026; lib/auth.js). The gate lets this through for someone who still has to pick one.
import { whoIs, setPw, checkPw } from '../../lib/auth.js'
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ error: 'POST' }, 405)
  const w = await whoIs(request, env); if (!w) return json({ error: 'SIGN IN FIRST' }, 401)
  let b; try { b = JSON.parse((await request.text()).slice(0, 2000)) } catch { return json({ error: 'NOT JSON' }, 400) }
  const pw = String(b?.password ?? '')
  if (pw.length < 8 || pw.length > 200) return json({ error: '8 OR MORE CHARACTERS' }, 400)
  if (!w.user.must && !(await checkPw(env, w.name, String(b?.old ?? '')))) return json({ error: 'YOUR OLD PASSWORD FIRST' }, 403)
  if (await checkPw(env, w.name, pw)) return json({ error: 'PICK A NEW ONE, NOT THE ONE YOU WERE GIVEN' }, 400)
  await setPw(env, w.name, pw, false)
  return json({ ok: true, must: false })
}
