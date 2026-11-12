// Sign-in for the private site (11 Nov 2026, Andrew: "Password protected for users (have one off the bat, then let people set their own)"). Replaces the invite links.
// Users live in the TOKENS KV namespace (already bound) as u:<name in lowercase> = { name, salt, hash, iter, must } (must: still on the password Andrew gave
// them; the site asks for their own before anything else). A sign-in makes a session s:<random id> = { name } for a year, kept in the HttpOnly cookie nn_s.
// Passwords are PBKDF2-SHA256 with a per-user salt (ops/users.mjs makes the same hash in node). Ten wrong passwords for a name in an hour and it waits.
export const ITER = 100000
const enc = new TextEncoder()
const b64 = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0))
export async function hashPw(pw, salt, iter = ITER) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits'])
  return b64(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: iter }, key, 256)))
}
export const newSalt = () => b64(crypto.getRandomValues(new Uint8Array(16)))
export const cleanLogin = (s) => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9 ._-]/g, '').slice(0, 30)
export const userKey = (name) => 'u:' + cleanLogin(name)
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0 }
export async function getUser(env, name) { try { return JSON.parse((await env.TOKENS.get(userKey(name))) ?? 'null') } catch { return null } }
export async function checkPw(env, name, pw) {
  const u = await getUser(env, name)
  if (!u || !pw) return null
  return same(await hashPw(String(pw), u.salt, u.iter ?? ITER), u.hash) ? u : null
}
export async function setPw(env, name, pw, must = false) {
  const u = (await getUser(env, name)) ?? { name: cleanLogin(name) }, salt = newSalt()
  const next = { ...u, salt, hash: await hashPw(pw, salt), iter: ITER, must, changed: new Date().toISOString() }
  await env.TOKENS.put(userKey(name), JSON.stringify(next))
  return next
}
export async function newSession(env, name) {
  const sid = b64(crypto.getRandomValues(new Uint8Array(24)))
  await env.TOKENS.put('s:' + sid, JSON.stringify({ name: cleanLogin(name), at: new Date().toISOString() }), { expirationTtl: 365 * 86400 })
  return sid
}
export const sessionId = (request) => { const m = /(?:^|;\s*)nn_s=([A-Za-z0-9_-]{20,64})/.exec(request.headers.get('Cookie') || ''); return m ? m[1] : null }
// the signed-in user for a request: { name, user } or null
export async function whoIs(request, env) {
  const sid = sessionId(request); if (!sid) return null
  let s = null; try { s = JSON.parse((await env.TOKENS.get('s:' + sid)) ?? 'null') } catch {}
  if (!s?.name) return null
  const user = await getUser(env, s.name); if (!user) return null
  return { name: s.name, user, sid }
}
export const cookie = (sid, maxAge = 365 * 86400) => `nn_s=${sid}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`
// wrong passwords: ten an hour for a name
export async function tooMany(env, name) { const k = `a:${cleanLogin(name)}:${new Date().toISOString().slice(0, 13)}`; return Number((await env.TOKENS.get(k)) ?? 0) >= 10 }
export async function missed(env, name) { const k = `a:${cleanLogin(name)}:${new Date().toISOString().slice(0, 13)}`; await env.TOKENS.put(k, String(Number((await env.TOKENS.get(k)) ?? 0) + 1), { expirationTtl: 7200 }) }

// the sign-in page: one file, no assets (nothing else on the site loads before you are in)
export const LOGIN_HTML = (mode = 'in') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Nuke Navigator</title>
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#030403;color:#e8e1c9;font:18px/1.35 ui-monospace,Consolas,monospace;padding:16px}
form{width:min(380px,100%);display:grid;gap:12px;border:2px solid #f0802a;padding:22px}h1{margin:0 0 4px;font-size:18px;letter-spacing:.18em;color:#f0802a}p{margin:0;color:#8a8f99;font-size:14px}
label{display:grid;gap:4px;font-size:13px;letter-spacing:.12em;color:#8a8f99}input{font:inherit;background:#030403;color:#e8e1c9;border:2px solid #3a3f47;padding:8px 10px}input:focus{outline:none;border-color:#f0802a}
button{font:inherit;letter-spacing:.14em;background:#f0802a;color:#030403;border:0;padding:10px;cursor:pointer}#m{min-height:1.3em;color:#ff7a00;font-size:14px}</style></head><body>
<form id="f"><h1>NUKE NAVIGATOR</h1>${mode === 'set' ? `<p>NEW HERE: PICK YOUR OWN PASSWORD (8 OR MORE CHARACTERS). THE ONE YOU WERE GIVEN STOPS WORKING.</p>
<label>NEW PASSWORD<input id="p1" type="password" autocomplete="new-password" minlength="8" required></label><label>AGAIN<input id="p2" type="password" autocomplete="new-password" minlength="8" required></label><button>SET IT</button>`
: `<p>PRIVATE. BEST ON A BIG SCREEN.</p><label>NAME<input id="n" autocomplete="username" autocapitalize="none" required></label><label>PASSWORD<input id="p" type="password" autocomplete="current-password" required></label><button>SIGN IN</button>`}<div id="m"></div></form>
<script>const f=document.getElementById('f'),m=document.getElementById('m');f.addEventListener('submit',async(e)=>{e.preventDefault();m.textContent='...';const set=${mode === 'set'};
if(set&&document.getElementById('p1').value!==document.getElementById('p2').value){m.textContent='THOSE TWO DO NOT MATCH';return}
const r=await fetch(set?'/api/password':'/api/login',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(set?{password:document.getElementById('p1').value}:{name:document.getElementById('n').value,password:document.getElementById('p').value})});
const j=await r.json().catch(()=>({}));if(r.ok){location.href=j.must?'/login?set=1':'/'}else m.textContent=j.error||'NO'});</script></body></html>`
