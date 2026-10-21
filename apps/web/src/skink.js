// Skin K: the 2001 look. A black field; flat colour blocks (or hairline outlines) carry the category; thin lines carry the data; two typefaces only (Barlow Condensed
// for blocks and the verdict, Share Tech Mono for readouts); a flat result slab; no bezels, no glow, no gradients. Every colour is a CSS variable set by a look in
// looks_k.js, so the same layout comes in ten palettes. Layout classes: lay-side (default), lay-dock, lay-min.
// Reference: ui-options/ilikeinterfaces-ref (2001 warning, schematic and navigation screens) and its STYLE-NOTES.md.
export const SKINK_CSS = `
@font-face{font-family:BC;src:url(/fonts/BarlowCondensed-Bold.ttf)}
@font-face{font-family:BM;src:url(/fonts/BarlowCondensed-Medium.ttf)}
@font-face{font-family:STM;src:url(/fonts/ShareTechMono-Regular.ttf)}
#dojo.ui-K{--L:300px;--R:340px;--T:44px;font-family:BM,Arial,sans-serif;color:var(--tx);text-transform:uppercase;letter-spacing:.08em}
#dojo.ui-K *{box-sizing:border-box}
#dojo.ui-K .xcell{display:none}
#dojo.ui-K .xbar,#dojo.ui-K .xc,#dojo.ui-K .xr2{display:block;position:absolute;background:var(--k);z-index:0}
#dojo.ui-K .xbar{left:0;right:0;top:0;height:var(--T);border-bottom:1px solid var(--ln)}
#dojo.ui-K .xc{left:0;top:var(--T);bottom:0;width:var(--L);border-right:1px solid var(--ln)}
#dojo.ui-K .xr2{right:0;top:var(--T);bottom:0;width:var(--R);border-left:1px solid var(--ln)}
#dojo.ui-K #dj-title{position:absolute;left:18px;top:0;height:var(--T);display:flex;align-items:center;margin:0;padding:0;background:none;border:0;box-shadow:none;transform:none;font:700 21px BC;letter-spacing:.34em;color:var(--tx);text-shadow:none;-webkit-text-stroke:0;z-index:2}
#dojo.ui-K #dj-chips{display:flex;position:absolute;left:calc(var(--L) + 18px);top:0;height:var(--T);align-items:center;gap:22px;z-index:2;font:400 12px STM;color:var(--dim);letter-spacing:.14em}
#dojo.ui-K #dj-chips span{border:0;padding:0;height:auto}
#dojo.ui-K #dj-skins{display:none}
#dojo.ui-K.dev #dj-skins{display:flex;position:absolute;right:16px;top:8px;z-index:3;background:none;padding:0;color:var(--dim);font:400 11px STM;gap:4px}
#dojo.ui-K.dev #dj-skins button{background:none;color:var(--tx);border:1px solid var(--ln);border-radius:0;font:400 11px STM;padding:2px 7px}
/* control tiles */
#dojo.ui-K #dj-ctl{left:0;top:var(--T);bottom:0;width:var(--L);padding:12px;background:none;border:0;box-shadow:none;transform:none;display:flex;flex-direction:column;gap:8px;max-width:none;border-radius:0;z-index:2;overflow:hidden}
#dojo.ui-K #dj-ctl .tape,#dojo.ui-K #dj-ctl .frame{display:none}
#dojo.ui-K #dj-ctl .row{position:relative;display:block;flex:none;height:100px;margin:0;padding:0;color:var(--tc);min-width:0;background:var(--tbg);border:1px solid var(--tb)}
#dojo.ui-K #dj-ctl label{position:absolute;left:12px;top:8px;width:auto;min-width:0;font:700 12px BC;letter-spacing:.2em;transform:none}
#dojo.ui-K #dj-ctl label::before{display:none}
#dojo.ui-K #dj-ctl .val{position:absolute;left:12px;top:24px;min-width:0;background:none;border:0;padding:0;font:700 42px/1 BC;letter-spacing:.02em;text-align:left;color:inherit}
#dojo.ui-K #dj-ctl input[type=range]{position:absolute;left:12px;right:12px;bottom:9px;width:calc(100% - 24px);height:16px;margin:0;-webkit-appearance:none;appearance:none;outline:none;background:linear-gradient(currentColor,currentColor) 0 50%/100% 1px no-repeat,repeating-linear-gradient(90deg,currentColor 0 1px,transparent 1px 12px) 0 100%/100% 6px no-repeat;color:inherit}
#dojo.ui-K #dj-ctl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:9px;height:16px;border-radius:0;background:currentColor;border:0;box-shadow:none}
#dojo.ui-K #dj-ctl .row:nth-of-type(7){height:auto;background:none;border:0;display:flex;align-items:center;gap:10px;color:var(--dim);margin-top:4px}
#dojo.ui-K #dj-ctl .row:nth-of-type(7) label{position:static;font:400 11px STM;letter-spacing:.16em}
#dojo.ui-K #hand{text-transform:uppercase;background:none;border:1px solid var(--ln);border-radius:0;box-shadow:none;font:400 11px STM;letter-spacing:.14em;color:var(--tx);padding:4px 10px}
#dojo.ui-K .presets{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
#dojo.ui-K .presets button{text-transform:uppercase;background:none;border:1px solid var(--ln);border-radius:0;box-shadow:none;color:var(--tx);font:400 11px STM;letter-spacing:.14em;padding:5px 9px;margin:0}
#dojo.ui-K .presets button:hover,#dojo.ui-K .presets button.go{background:var(--acc);color:var(--acct);border-color:var(--acc)}
#dojo.ui-K .presets button[data-radar]{display:none}
/* right column: result slab, flight figure, readout rows, landing spread */
#dojo.ui-K #dj-out{position:absolute;right:0;top:var(--T);bottom:0;width:var(--R);padding:12px;display:flex;flex-direction:column;gap:10px;background:none;border:0;box-shadow:none;transform:none;z-index:2;overflow:hidden}
#dojo.ui-K .tape,#dojo.ui-K .frame{display:none}
#dojo.ui-K #dj-slab{position:relative;height:196px;flex:none;background:var(--sl-wait);color:var(--sl-tx);display:flex;flex-direction:column;justify-content:space-between;padding:10px 14px;text-align:center}
#dojo.ui-K #dj-slab:has(.st-gone){background:var(--sl-hr)}#dojo.ui-K #dj-slab:has(.st-nuke){background:var(--sl-nuke)}#dojo.ui-K #dj-slab:has(.st-splash){background:var(--sl-splash)}
#dojo.ui-K #dj-slab:has(.st-scraper){background:var(--sl-scr)}#dojo.ui-K #dj-slab:has(.st-wall),#dojo.ui-K #dj-slab:has(.st-close){background:var(--sl-wall)}
#dojo.ui-K #dj-slab:has(.st-play){background:var(--sl-play)}#dojo.ui-K #dj-slab:has(.st-foul){background:var(--sl-foul)}
#dojo.ui-K #dj-state{position:static;margin:0;padding:0;background:none;border:0;transform:none;display:block;font:400 11px STM;letter-spacing:.22em;color:inherit;opacity:.8}
#dojo.ui-K #dj-verdict{position:static;flex:1;display:flex;align-items:center;justify-content:center;margin:0;padding:0;min-height:0;width:100%;background:none;color:inherit;font:700 56px/.95 BC;letter-spacing:.03em;text-shadow:none;overflow:hidden;clip-path:none;word-break:keep-all;transform:none}
#dojo.ui-K #dj-verdict .beat{display:inline-block;animation:kon .26s steps(4) both}
#dojo.ui-K #dj-verdict.st-wait{opacity:.55}
#dojo.ui-K #dj-sub{position:static;margin:0;min-height:15px;width:auto;font:400 12px STM;letter-spacing:.08em;color:inherit;text-transform:none}
#dojo.ui-K #dj-fig{position:static;display:block;flex:none;height:auto;margin:0;padding:0;border:0;background:none;transform:none}
#dojo.ui-K #dj-fig figcaption{position:static;margin:0 0 4px;padding:0;border:0;background:none;transform:none;font:400 10px STM;letter-spacing:.2em;color:var(--dim)}
#dojo.ui-K #dj-fig svg{background:none;border:0;border-radius:0;width:100%;height:auto}
#dojo.ui-K #dj-nums{position:static;display:flex;flex-direction:column;gap:4px;padding:0}
#dojo.ui-K #dj-nums .nr{display:grid;grid-template-columns:104px 1fr;height:40px;gap:3px}
#dojo.ui-K #dj-nums .nl{padding:5px 9px;font:700 14px/1.05 BC;letter-spacing:.14em;color:var(--rt);background:var(--rl);display:flex;align-items:center}
#dojo.ui-K #dj-nums .nv{position:relative;border:1px solid var(--ln);background:transparent;display:flex;align-items:center;justify-content:flex-end;padding:0 10px;font:400 19px STM;letter-spacing:.02em;color:var(--tx);text-transform:none}
#dojo.ui-K #dj-nums .nv svg{position:absolute;left:0;top:0;width:52%;height:100%;opacity:.4}
#dojo.ui-K #dj-nums .nv span{position:relative}
#dojo.ui-K #dj-nums .nr.alarm .nl{background:var(--alarm)!important;color:#fff}#dojo.ui-K #dj-nums .nr.alarm .nv{border-color:var(--alarm)}
#dj-p{display:none}
#dojo.ui-K #dj-p{display:block;margin-top:6px}
#dojo.ui-K #dj-p .pl{font:400 10px STM;letter-spacing:.16em;color:var(--dim);margin-bottom:6px}
#dojo.ui-K #dj-p .pb{display:flex;height:16px;border:1px solid var(--ln)}
#dojo.ui-K #dj-p .pb i{display:block;height:100%}
#dojo.ui-K #dj-p .h{background:var(--bar-h)}#dojo.ui-K #dj-p .p{background:var(--bar-p)}#dojo.ui-K #dj-p .f{background:transparent;border-left:1px solid var(--dim)}
#dojo.ui-K #dj-p .pk{display:flex;justify-content:space-between;margin-top:6px;font:400 11px STM;letter-spacing:.08em;color:var(--tx)}
#dojo.ui-K #dj-p .pk b{display:inline-block;width:9px;height:9px;margin-right:6px;vertical-align:-1px}
#dojo.ui-K #dj-p .pk b.f{border:1px solid var(--dim)}
#dojo.ui-K #dj-note{position:static;margin-top:auto;padding:0;border:0;background:none;transform:none;font:400 10px/1.35 STM;letter-spacing:.06em;color:var(--dim);opacity:1;text-transform:none}
#dojo.ui-K #dj-seance{left:calc(var(--L) + 16px);top:calc(var(--T) + 14px);bottom:auto;width:auto;min-width:0;max-width:260px;background:var(--k);color:var(--tx);border:1px solid var(--ln);border-radius:0;box-shadow:none;font:400 12px STM;letter-spacing:.08em;transform:none;padding:6px 8px;z-index:3}
#dojo.ui-K #dj-seance button{background:none;color:var(--tx);border:1px solid var(--ln);border-radius:0;box-shadow:none;font:400 11px STM;letter-spacing:.16em;padding:3px 8px}
#dojo.ui-K #dj-seance.on button{background:var(--acc);color:var(--acct);border-color:var(--acc)}
#dojo.ui-K #dj-seance .bar{border:1px solid var(--ln);border-radius:0;height:8px}
/* comparison strip */
body:has(#dojo.ui-K) #strip{left:calc(300px + 14px);right:calc(340px + 14px);bottom:12px;color:var(--dim)}
body:has(#dojo.ui-K) #cmp{background:var(--k);border:1px solid var(--ln);box-shadow:none;transform:none;border-radius:0;padding:6px 10px;margin:0;cursor:default}
body:has(#dojo.ui-K) #cmp .line{font:400 12px/1.4 STM;letter-spacing:.04em;text-transform:none}
body:has(#dojo.ui-K) #cmp b{background:var(--acc);color:var(--acct);border-radius:0;font:700 10px BC;letter-spacing:.18em;padding:1px 6px}
body:has(#dojo.ui-K) #cmp .src,body:has(#dojo.ui-K) #cmp .hint,body:has(#dojo.ui-K) #spec{display:none}
/* layout: dock (everything along the bottom, the park wide) */
#dojo.ui-K.lay-dock{--DH:196px}
#dojo.ui-K.lay-dock .xc{left:0;right:0;top:auto;bottom:0;width:auto;height:var(--DH);border-right:0;border-top:1px solid var(--ln)}
#dojo.ui-K.lay-dock .xr2{display:none}
#dojo.ui-K.lay-dock #dj-chips{left:340px}
#dojo.ui-K.lay-dock #dj-ctl{left:0;right:auto;top:auto;bottom:0;width:calc(100% - 640px);height:var(--DH);flex-direction:row;flex-wrap:wrap;gap:8px;padding:12px;align-content:flex-start}
#dojo.ui-K.lay-dock #dj-ctl .row{height:84px;width:calc(20% - 7px);min-width:130px}
#dojo.ui-K.lay-dock #dj-ctl .val{font-size:34px;top:22px}
#dojo.ui-K.lay-dock #dj-ctl .row:nth-of-type(7){width:auto;height:auto}
#dojo.ui-K.lay-dock .presets{width:100%;margin-top:0}
#dojo.ui-K.lay-dock #dj-out{right:0;left:auto;top:auto;bottom:0;width:640px;height:var(--DH);flex-direction:row;gap:12px;padding:12px}
#dojo.ui-K.lay-dock #dj-slab{width:290px;height:100%}
#dojo.ui-K.lay-dock #dj-slab #dj-verdict{font-size:44px}
#dojo.ui-K.lay-dock #dj-fig,#dojo.ui-K.lay-dock #dj-p,#dojo.ui-K.lay-dock #dj-note{display:none}
#dojo.ui-K.lay-dock #dj-nums{flex:1;display:grid;grid-template-columns:1fr;gap:3px}
#dojo.ui-K.lay-dock #dj-nums .nr{height:27px;grid-template-columns:96px 1fr}
#dojo.ui-K.lay-dock #dj-nums .nl{padding:2px 8px;font-size:12px}#dojo.ui-K.lay-dock #dj-nums .nv{font-size:15px}
#dojo.ui-K.lay-dock #dj-seance{left:16px}
body:has(#dojo.ui-K.lay-dock) #strip{left:14px;right:14px;bottom:208px}
/* layout: min (park full-bleed, a thin control column, the result slab over the bottom) */
#dojo.ui-K.lay-min{--L:232px}
#dojo.ui-K.lay-min .xr2{display:none}
#dojo.ui-K.lay-min #dj-chips{left:250px}
#dojo.ui-K.lay-min #dj-ctl{padding:10px;gap:6px}
#dojo.ui-K.lay-min #dj-ctl .row{height:74px}
#dojo.ui-K.lay-min #dj-ctl .val{font-size:30px;top:20px}
#dojo.ui-K.lay-min #dj-ctl label{font-size:11px;top:6px}
#dojo.ui-K.lay-min #dj-ctl input[type=range]{bottom:6px;height:14px}
#dojo.ui-K.lay-min #dj-out{left:calc(var(--L) + 24px);right:24px;top:auto;bottom:24px;width:auto;height:auto;padding:0;display:grid;grid-template-columns:1fr 280px;gap:8px;pointer-events:none}
#dojo.ui-K.lay-min #dj-slab{height:112px;pointer-events:auto}
#dojo.ui-K.lay-min #dj-slab #dj-verdict{font-size:40px}
#dojo.ui-K.lay-min #dj-fig,#dojo.ui-K.lay-min #dj-p,#dojo.ui-K.lay-min #dj-note{display:none}
#dojo.ui-K.lay-min #dj-nums{display:grid;grid-template-columns:1fr;gap:3px;pointer-events:auto}
#dojo.ui-K.lay-min #dj-nums .nr:nth-child(n+4){display:none}
#dojo.ui-K.lay-min #dj-nums .nr{height:34px;grid-template-columns:90px 1fr}
#dojo.ui-K.lay-min #dj-nums .nl{font-size:12px;padding:3px 8px}#dojo.ui-K.lay-min #dj-nums .nv{font-size:16px;background:var(--k)}
body:has(#dojo.ui-K.lay-min) #strip{display:none!important}
@keyframes kon{0%{opacity:0}35%{opacity:1}50%{opacity:.4}100%{opacity:1}}
`
