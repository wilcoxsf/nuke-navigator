// Skin K: the 2001 look. A black field; flat saturated colour blocks carry the category; thin hairlines carry the data; two typefaces only
// (Barlow Condensed for blocks and the verdict, Share Tech Mono for readouts); a flat lit slab for the result; no bezels, no glow, no gradients.
// Reference: ui-options/ilikeinterfaces-ref (2001 warning, schematic and navigation screens) and its STYLE-NOTES.md.
export const SKINK_CSS = `
@font-face{font-family:BC;src:url(/fonts/BarlowCondensed-Bold.ttf)}
@font-face{font-family:BM;src:url(/fonts/BarlowCondensed-Medium.ttf)}
@font-face{font-family:STM;src:url(/fonts/ShareTechMono-Regular.ttf)}
#dojo.ui-K{--L:300px;--R:340px;--T:44px;--k:#050608;--ln:#1c2a31;--tx:#d3e4e9;--dim:#71909b;--bl:#2c63c8;--cy:#3fb6d4;--te:#2fa39a;--vi:#6e4db0;--ol:#8d9a3c;--am:#e2823a;font-family:BM,Arial,sans-serif;color:var(--tx);text-transform:uppercase;letter-spacing:.08em}
#dojo.ui-K *{box-sizing:border-box}
#dojo.ui-K .xcell{display:none}
#dojo.ui-K .xbar,#dojo.ui-K .xc,#dojo.ui-K .xr2{display:block;position:absolute;background:var(--k);z-index:0}
#dojo.ui-K .xbar{left:0;right:0;top:0;height:var(--T);border-bottom:1px solid var(--ln)}
#dojo.ui-K .xc{left:0;top:var(--T);bottom:0;width:var(--L);border-right:1px solid var(--ln)}
#dojo.ui-K .xr2{right:0;top:var(--T);bottom:0;width:var(--R);border-left:1px solid var(--ln)}
#dojo.ui-K #dj-title{position:absolute;left:18px;top:0;height:var(--T);display:flex;align-items:center;margin:0;padding:0;background:none;border:0;box-shadow:none;transform:none;font:700 21px BC;letter-spacing:.34em;color:#c4d6dc;text-shadow:none;-webkit-text-stroke:0;z-index:2}
#dojo.ui-K #dj-chips{display:flex;position:absolute;left:calc(var(--L) + 18px);top:0;height:var(--T);align-items:center;gap:22px;z-index:2;font:400 12px STM;color:var(--dim);letter-spacing:.14em}
#dojo.ui-K #dj-chips span{border:0;padding:0;height:auto}
#dojo.ui-K #dj-skins{display:none}
#dojo.ui-K.dev #dj-skins{display:flex;position:absolute;right:16px;top:8px;z-index:3;background:none;padding:0;color:var(--dim);font:400 11px STM;gap:4px}
#dojo.ui-K.dev #dj-skins button{background:none;color:var(--tx);border:1px solid var(--ln);border-radius:0;font:400 11px STM;padding:2px 7px}
/* control tiles: flat colour blocks, big numerals, a hairline slider */
#dojo.ui-K #dj-ctl{left:0;top:var(--T);bottom:0;width:var(--L);padding:12px;background:none;border:0;box-shadow:none;transform:none;display:flex;flex-direction:column;gap:8px;max-width:none;border-radius:0;z-index:2;overflow:hidden}
#dojo.ui-K #dj-ctl .tape,#dojo.ui-K #dj-ctl .frame{display:none}
#dojo.ui-K #dj-ctl .row{position:relative;display:block;flex:none;height:100px;margin:0;padding:0;color:#fff;min-width:0}
#dojo.ui-K #dj-ctl .row:nth-of-type(2){background:var(--bl)}
#dojo.ui-K #dj-ctl .row:nth-of-type(3){background:var(--cy);color:#04222b}
#dojo.ui-K #dj-ctl .row:nth-of-type(4){background:var(--te)}
#dojo.ui-K #dj-ctl .row:nth-of-type(5){background:var(--vi)}
#dojo.ui-K #dj-ctl .row:nth-of-type(6){background:var(--ol);color:#10170a}
#dojo.ui-K #dj-ctl label{position:absolute;left:12px;top:8px;width:auto;min-width:0;font:700 12px BC;letter-spacing:.2em;transform:none}
#dojo.ui-K #dj-ctl label::before{display:none}
#dojo.ui-K #dj-ctl .val{position:absolute;left:12px;top:24px;min-width:0;background:none;border:0;padding:0;font:700 42px/1 BC;letter-spacing:.02em;text-align:left;color:inherit}
#dojo.ui-K #dj-ctl input[type=range]{position:absolute;left:12px;right:12px;bottom:9px;width:calc(100% - 24px);height:16px;margin:0;-webkit-appearance:none;appearance:none;outline:none;background:linear-gradient(currentColor,currentColor) 0 50%/100% 1px no-repeat,repeating-linear-gradient(90deg,currentColor 0 1px,transparent 1px 12px) 0 100%/100% 6px no-repeat;color:inherit}
#dojo.ui-K #dj-ctl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:9px;height:16px;border-radius:0;background:currentColor;border:0;box-shadow:none}
#dojo.ui-K #dj-ctl .row:nth-of-type(7){height:auto;background:none;display:flex;align-items:center;gap:10px;color:var(--dim);margin-top:4px}
#dojo.ui-K #dj-ctl .row:nth-of-type(7) label{position:static;font:400 11px STM;letter-spacing:.16em}
#dojo.ui-K #hand{text-transform:uppercase;background:none;border:1px solid var(--ln);border-radius:0;box-shadow:none;font:400 11px STM;letter-spacing:.14em;color:var(--tx);padding:4px 10px}
#dojo.ui-K .presets{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
#dojo.ui-K .presets button{text-transform:uppercase;background:none;border:1px solid var(--ln);border-radius:0;box-shadow:none;color:var(--tx);font:400 11px STM;letter-spacing:.14em;padding:5px 9px;margin:0}
#dojo.ui-K .presets button:hover,#dojo.ui-K .presets button.go{background:var(--cy);color:#04222b;border-color:var(--cy)}
/* right column: the result slab, the flight figure, the readout rows */
#dojo.ui-K #dj-out{position:absolute;right:0;top:var(--T);bottom:0;width:var(--R);padding:12px;display:flex;flex-direction:column;gap:10px;background:none;border:0;box-shadow:none;transform:none;z-index:2;overflow:hidden}
#dojo.ui-K .tape,#dojo.ui-K .frame{display:none}
#dojo.ui-K #dj-slab{position:relative;height:196px;flex:none;background:#1f2c33;display:flex;flex-direction:column;justify-content:space-between;padding:10px 14px 10px;text-align:center}
#dojo.ui-K #dj-slab:has(.st-gone){background:#c9772e}#dojo.ui-K #dj-slab:has(.st-nuke){background:#b5302a}#dojo.ui-K #dj-slab:has(.st-splash){background:#1f8fb0}
#dojo.ui-K #dj-slab:has(.st-scraper){background:#b88a1e}#dojo.ui-K #dj-slab:has(.st-wall),#dojo.ui-K #dj-slab:has(.st-close){background:#8f5f1b}
#dojo.ui-K #dj-slab:has(.st-play){background:#37565f}#dojo.ui-K #dj-slab:has(.st-foul){background:#46535a}
#dojo.ui-K #dj-state{position:static;margin:0;padding:0;background:none;border:0;transform:none;display:block;font:400 11px STM;letter-spacing:.22em;color:rgba(255,255,255,.82)}
#dojo.ui-K #dj-verdict{position:static;flex:1;display:flex;align-items:center;justify-content:center;margin:0;padding:0;min-height:0;width:100%;background:none;color:#fff;font:700 56px/.95 BC;letter-spacing:.03em;text-shadow:none;overflow:hidden;clip-path:none;word-break:keep-all;transform:none}
#dojo.ui-K #dj-verdict .beat{display:inline-block;animation:kon .26s steps(4) both}
#dojo.ui-K #dj-verdict.st-wait{color:rgba(255,255,255,.55)}
#dojo.ui-K #dj-sub{position:static;margin:0;min-height:15px;width:auto;font:400 12px STM;letter-spacing:.08em;color:rgba(255,255,255,.92);text-transform:none}
#dojo.ui-K #dj-fig{position:static;display:block;flex:none;height:auto;margin:0;padding:0;border:0;background:none;transform:none}
#dojo.ui-K #dj-fig figcaption{position:static;margin:0 0 4px;padding:0;border:0;background:none;transform:none;font:400 10px STM;letter-spacing:.2em;color:var(--dim)}
#dojo.ui-K #dj-fig svg{background:none;border:0;border-radius:0;width:100%;height:auto}
#dojo.ui-K #dj-nums{position:static;display:flex;flex-direction:column;gap:4px;padding:0}
#dojo.ui-K #dj-nums .nr{display:grid;grid-template-columns:104px 1fr;height:40px;gap:3px}
#dojo.ui-K #dj-nums .nl{padding:5px 9px;font:700 14px/1.05 BC;letter-spacing:.14em;color:#fff;display:flex;align-items:center}
#dojo.ui-K #dj-nums .nv{position:relative;border:1px solid var(--ln);background:#06090b;display:flex;align-items:center;justify-content:flex-end;padding:0 10px;font:400 19px STM;letter-spacing:.02em;color:var(--tx);text-transform:none}
#dojo.ui-K #dj-nums .nv svg{position:absolute;inset:0;width:100%;height:100%;opacity:.45}
#dojo.ui-K #dj-nums .nv span{position:relative}
#dojo.ui-K #dj-nums .nr.alarm .nl{background:#c0332a!important}#dojo.ui-K #dj-nums .nr.alarm .nv{border-color:#c0332a}
#dj-p{display:none}
#dojo.ui-K #dj-p{display:block;margin-top:6px}
#dojo.ui-K #dj-p .pl{font:400 10px STM;letter-spacing:.16em;color:var(--dim);margin-bottom:6px}
#dojo.ui-K #dj-p .pb{display:flex;height:16px;border:1px solid var(--ln);gap:0}
#dojo.ui-K #dj-p .pb i{display:block;height:100%}
#dojo.ui-K #dj-p .h{background:#e8e1c9}#dojo.ui-K #dj-p .p{background:#4a6671}#dojo.ui-K #dj-p .f{background:transparent;border-left:1px solid #71909b}
#dojo.ui-K #dj-p .pk{display:flex;justify-content:space-between;margin-top:6px;font:400 11px STM;letter-spacing:.08em;color:var(--tx)}
#dojo.ui-K #dj-p .pk b{display:inline-block;width:9px;height:9px;margin-right:6px;vertical-align:-1px}
#dojo.ui-K #dj-p .pk b.f{border:1px solid #71909b}
#dojo.ui-K #dj-note{position:static;margin-top:auto;padding:0;border:0;background:none;transform:none;font:400 10px/1.35 STM;letter-spacing:.06em;color:var(--dim);opacity:1;text-transform:none}
/* Seat Seance, quiet */
#dojo.ui-K #dj-seance{left:calc(var(--L) + 16px);top:calc(var(--T) + 14px);bottom:auto;width:auto;min-width:0;max-width:260px;background:rgba(5,6,8,.82);color:var(--tx);border:1px solid var(--ln);border-radius:0;box-shadow:none;font:400 12px STM;letter-spacing:.08em;transform:none;padding:6px 8px;z-index:3}
#dojo.ui-K #dj-seance button{background:none;color:var(--tx);border:1px solid var(--ln);border-radius:0;box-shadow:none;font:400 11px STM;letter-spacing:.16em;padding:3px 8px}
#dojo.ui-K #dj-seance.on button{background:var(--cy);color:#04222b;border-color:var(--cy)}
#dojo.ui-K #dj-seance .bar{border:1px solid var(--ln);border-radius:0;height:8px}
/* comparison strip */
body:has(#dojo.ui-K){background:#050608}
body:has(#dojo.ui-K) #strip{left:calc(300px + 14px);right:calc(340px + 14px);bottom:12px;color:#9db3bb}
body:has(#dojo.ui-K) #cmp{background:rgba(5,6,8,.88);border:1px solid #1c2a31;box-shadow:none;transform:none;border-radius:0;padding:6px 10px;margin:0;cursor:default}
body:has(#dojo.ui-K) #cmp .line{font:400 12px/1.4 STM;letter-spacing:.04em;text-transform:none}
body:has(#dojo.ui-K) #cmp b{background:#3fb6d4;color:#04222b;border-radius:0;font:700 10px BC;letter-spacing:.18em;padding:1px 6px}
body:has(#dojo.ui-K) #cmp .src,body:has(#dojo.ui-K) #cmp .hint,body:has(#dojo.ui-K) #spec{display:none}
@keyframes kon{0%{opacity:0}35%{opacity:1}50%{opacity:.4}100%{opacity:1}}
`
