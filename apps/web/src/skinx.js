// Skin X: the engineered-grid look (from the Crox reference): cool grey paper, thick black frame cells around the park, one hot orange, Space Grotesk,
// ruler-tick sliders. The 3D park is the main event; the cells hug its edges. Layout sizes live in CSS variables so main.js can centre the park in the open window.
export const SKINX_CSS = `
@font-face{font-family:SG;src:url(/fonts/SpaceGrotesk-Variable.ttf);font-weight:300 700}
#dojo.ui-X *{box-sizing:border-box}
#dojo.ui-X{--L:344px;--R:316px;--T:56px;--B:128px;--ink:#1a1b1c;--paper:#e3e7eb;--hot:#ff5f14;--hair:#c3c9d0;font-family:SG,Arial,sans-serif;color:var(--ink)}
.xcell,#dj-chips{display:none}
#dojo.ui-X .xcell{display:block;position:absolute;background:var(--paper);z-index:0}
#dojo.ui-X .xbar{left:0;right:0;top:0;height:var(--T);border-bottom:4px solid var(--ink)}
#dojo.ui-X .xv{left:0;top:var(--T);width:var(--L);height:288px;border-right:4px solid var(--ink);border-bottom:4px solid var(--ink)}
#dojo.ui-X .xc{left:0;top:calc(var(--T) + 288px);bottom:0;width:var(--L);border-right:4px solid var(--ink)}
#dojo.ui-X .xr1{right:0;top:var(--T);width:var(--R);height:236px;border-left:4px solid var(--ink);border-bottom:4px solid var(--ink)}
#dojo.ui-X .xr2{right:0;top:calc(var(--T) + 236px);bottom:0;width:var(--R);border-left:4px solid var(--ink)}
#dojo.ui-X #dj-title{position:absolute;left:24px;top:0;height:var(--T);display:flex;align-items:center;margin:0;padding:0;background:none;border:0;box-shadow:none;transform:none;font:700 22px SG;letter-spacing:-.01em;color:var(--ink);text-shadow:none;-webkit-text-stroke:0;text-transform:uppercase;z-index:2}
#dojo.ui-X #dj-chips{display:flex;position:absolute;left:var(--L);top:0;height:var(--T);align-items:center;gap:0;z-index:2}
#dojo.ui-X #dj-chips span{height:var(--T);display:flex;align-items:center;padding:0 20px;border-left:4px solid var(--ink);font:500 12px SG;letter-spacing:.06em;text-transform:uppercase}
#dojo.ui-X #dj-skins{position:absolute;right:0;top:0;height:var(--T);display:flex;align-items:center;background:none;padding:0 14px;border-radius:0;font:600 11px SG;letter-spacing:.1em;gap:4px;color:var(--ink);z-index:2}
#dojo.ui-X #dj-skins button{margin:0;padding:3px 9px;background:var(--paper);color:var(--ink);border:2px solid var(--ink);border-radius:0;font:600 12px SG}
#dojo.ui-X #dj-skins button.on{background:var(--hot);color:var(--ink)}
/* verdict, in the top-left cell */
#dojo.ui-X #dj-out{position:static;width:auto;padding:0;background:none;border:0;box-shadow:none;transform:none}
#dojo.ui-X #dj-state{position:absolute;left:24px;top:calc(var(--T) + 14px);margin:0;padding:0;background:none;border:0;transform:none;font:600 12px SG;letter-spacing:.14em;text-transform:uppercase;display:block;z-index:2}
#dojo.ui-X #dj-verdict{position:absolute;left:22px;top:calc(var(--T) + 40px);width:calc(var(--L) - 44px);height:168px;margin:0;padding:0;min-height:0;display:block;background:none;color:var(--ink);font:700 72px/.92 SG;letter-spacing:-.045em;text-transform:uppercase;text-shadow:none;overflow:hidden;clip-path:none;z-index:2;word-break:keep-all}
#dojo.ui-X #dj-verdict .bal{display:none}
#dojo.ui-X #dj-verdict .beat{display:inline-block;animation:xin .25s cubic-bezier(.2,1,.3,1) both}
#dojo.ui-X #dj-verdict.st-gone,#dojo.ui-X #dj-verdict.st-nuke,#dojo.ui-X #dj-verdict.st-splash,#dojo.ui-X #dj-verdict.st-scraper{color:var(--hot)}
#dojo.ui-X #dj-verdict.st-wait{color:#8a9097}
#dojo.ui-X #dj-sub{position:absolute;left:24px;top:calc(var(--T) + 216px);width:calc(var(--L) - 48px);margin:0;font:400 19px/1.15 SG;letter-spacing:-.01em;min-height:0;z-index:2}
/* controls, in the lower-left cell */
#dojo.ui-X #dj-ctl{left:0;top:calc(var(--T) + 288px);bottom:0;width:var(--L);padding:14px 24px 10px;background:none;border:0;box-shadow:none;transform:none;display:block;max-width:none;border-radius:0;z-index:2;overflow:hidden}
#dojo.ui-X #dj-ctl .tape,#dojo.ui-X #dj-ctl .frame{display:none}
#dojo.ui-X #dj-ctl .row{display:flex;flex-wrap:wrap;align-items:baseline;margin:4px 0 2px;min-width:0}
#dojo.ui-X #dj-ctl label{order:1;min-width:0;width:auto;font:500 12px SG;letter-spacing:.08em;text-transform:uppercase;transform:none;white-space:nowrap}
#dojo.ui-X #dj-ctl label::before{display:none}
#dojo.ui-X #dj-ctl .val{order:2;margin-left:auto;background:none;border:0;padding:0;min-width:0;font:700 24px/1 SG;letter-spacing:-.03em;text-align:right}
#dojo.ui-X #dj-ctl input[type=range]{order:3;flex:1 0 100%;-webkit-appearance:none;appearance:none;width:100%;height:24px;margin:0;background:repeating-linear-gradient(90deg,var(--ink) 0 1px,transparent 1px 10px) 0 100%/100% 10px no-repeat,repeating-linear-gradient(90deg,var(--ink) 0 2px,transparent 2px 50px) 0 100%/100% 16px no-repeat;outline:none}
#dojo.ui-X #dj-ctl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:26px;border-radius:0;background:var(--hot);border:0;box-shadow:none}
#dojo.ui-X #hand{background:none;border:2px solid var(--ink);border-radius:0;box-shadow:none;font:600 12px SG;letter-spacing:.06em;text-transform:uppercase;color:var(--ink);padding:3px 10px}
#dojo.ui-X .presets{display:flex;flex-wrap:wrap;gap:0;margin-top:8px}
.presets{display:none}
#dojo.ui-X .presets button{border:2px solid var(--ink);margin:0 -2px -2px 0;background:var(--paper);color:var(--ink);font:600 11px SG;letter-spacing:.06em;text-transform:uppercase;padding:6px 9px;cursor:pointer;border-radius:0;box-shadow:none}
#dojo.ui-X .presets button:hover{background:var(--hot)}
#dojo.ui-X .presets button.go{background:var(--hot)}
/* flight figure and numbers, in the right-hand cells */
#dojo.ui-X #dj-fig{position:absolute;right:0;top:var(--T);width:var(--R);height:236px;margin:0;padding:34px 18px 8px;border:0;background:none;transform:none;display:block;z-index:2}
#dojo.ui-X #dj-fig figcaption{position:absolute;left:18px;top:12px;margin:0;padding:0;border:0;background:none;transform:none;font:500 11px SG;letter-spacing:.1em;text-transform:uppercase;color:var(--ink)}
#dojo.ui-X #dj-fig svg{background:none;border:0;border-radius:0;width:100%;height:auto}
#dojo.ui-X #dj-nums{position:absolute;right:0;top:calc(var(--T) + 236px);width:var(--R);padding:12px 18px;display:block;z-index:2}
#dojo.ui-X #dj-nums div{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding:5px 0 3px;font:500 12px SG;letter-spacing:.06em;text-transform:uppercase}
#dojo.ui-X #dj-nums b{font:700 19px SG;letter-spacing:-.02em;white-space:nowrap}
#dojo.ui-X #dj-nums i{display:none}
#dojo.ui-X #dj-note{position:absolute;right:0;bottom:0;width:var(--R);padding:8px 18px 10px;margin:0;border:0;background:var(--paper);border-top:1px solid var(--ink);font:400 11px/1.2 SG;letter-spacing:.02em;text-transform:none;opacity:.8;transform:none;z-index:2}
/* Seat Seance and the comparison strip sit inside the open window over the park */
#dojo.ui-X #dj-seance{left:calc(var(--L) + 14px);top:calc(var(--T) + 14px);bottom:auto;width:280px;background:var(--paper);color:var(--ink);border:3px solid var(--ink);border-radius:0;box-shadow:none;font:500 13px SG;transform:none;z-index:3}
#dojo.ui-X #dj-seance button{background:var(--paper);color:var(--ink);border:2px solid var(--ink);border-radius:0;box-shadow:none;font:700 12px SG;letter-spacing:.08em}
#dojo.ui-X #dj-seance.on button{background:var(--hot)}
#dojo.ui-X #dj-seance .bar{border:2px solid var(--ink);border-radius:0}
body:has(#dojo.ui-X) #strip{left:calc(344px + 14px);right:calc(316px + 14px);bottom:12px}
body:has(#dojo.ui-X) #cmp{background:var(--paper,#e3e7eb);border:3px solid #1a1b1c;box-shadow:none;transform:none;border-radius:0;padding:6px 12px;margin:0}
body:has(#dojo.ui-X) #cmp .line{font:500 14px/1.3 SG,Arial,sans-serif;letter-spacing:0}
body:has(#dojo.ui-X) #cmp b{background:#ff5f14;color:#1a1b1c;border-radius:0;font:700 10px SG;letter-spacing:.1em}
body:has(#dojo.ui-X) #spec{display:none}
body:has(#dojo.ui-X){background:#1a1b1c}
@keyframes xin{from{transform:translateY(26px);opacity:0}to{transform:none;opacity:1}}
`
