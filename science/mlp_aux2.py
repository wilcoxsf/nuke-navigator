"""Experiments E40-E45: the multi-task MLP of mlp_aux.py with the knobs for the five outside-the-box ideas (brief 6 and Claude's own list). Every extra is training signal only, never an input, except where noted.
  --park-w W   E41: 30 counterfactual-park heads. For every ball: margin_p = observed projected distance - the fence distance of park p at the ball's TRUE landing bearing (parks30.json, 5-point profile), scaled by 30 ft, Huber, mean over parks, weight W.
  --fouls      E42: the 450k foul balls join the training rows with the home-run, bearing, landing, run-value and batted-ball heads masked; only the distance head and a fair/foul head (weight 0.1) see them. The home-run loss is a masked mean over fair rows,
               so the base rate is untouched. Fouls lack the res_*, dist_hat and direct_margin columns, so use --reduced for both this run and its control.
  --reduced    drop the feature columns the foul table does not have (the control for --fouls).
  --ids        E43: batter and pitcher ID embeddings (8 dims, ids with fewer than 30 train balls pooled to one unknown code), with whole-embedding dropout (--id-drop) and a heavy weight decay on the embeddings as the shrinkage.
  --hidden 512,256,128 --seeds 5 --swa 3   E44: wider net, more seeds, predictions averaged over the last 3 epochs instead of the single best epoch.
  --oof K      E40: K-fold by game on the train rows (one net per fold unless --seeds says more); writes the HEAD OUTPUTS (mlp_p, mlp_d, mlp_b, mlp_hx, mlp_hy, mlp_rv, mlp_bb0..3) as out-of-fold columns for train rows and fold-averaged columns for val and test,
               to feed trees (merge_mlp_oof.py then FEATSET=v38).
Everything is game-out-of-fold or period-split: train through 2025-05, val is the slice before test, test 2025-06-01 to 2026-09-27, the 2026 postseason lockbox is untouched.
Usage: FEATSET=v19 python mlp_aux2.py --data data/derived/bakeoff_features_v19.parquet --out-dir data/derived/e41_park --variant all --park-w 0.3 [--sample 0.03]"""
import argparse
import json
import os
import time
from pathlib import Path

os.environ.setdefault("FEATSET", "v19")
import numpy as np
import pandas as pd

import bakeoff as B

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True)
ap.add_argument("--out-dir", required=True)
ap.add_argument("--variant", choices=["bearing", "land", "all", "everything"], default="all")
ap.add_argument("--sample", type=float, default=1.0)
ap.add_argument("--seeds", type=int, default=3)
ap.add_argument("--epochs", type=int, default=10)
ap.add_argument("--hidden", default="256,128,64")
ap.add_argument("--drop", type=float, default=0.1)
ap.add_argument("--lr", type=float, default=3e-3)
ap.add_argument("--park-w", type=float, default=0.0)
ap.add_argument("--fouls", action="store_true")
ap.add_argument("--reduced", action="store_true")
ap.add_argument("--ids", action="store_true")
ap.add_argument("--id-drop", type=float, default=0.25)
ap.add_argument("--swa", type=int, default=0)
ap.add_argument("--oof", type=int, default=0)
ap.add_argument("--w", default="", help="head weight overrides, e.g. dist=0,brg=0,land=0,rv=0,bb=0,hr2=0.5")
ap.add_argument("--rv-perm", action="store_true", help="E45 echo control N3: shuffle the run-value labels within (HR, EV/10, LA/10) strata on train rows")
ap.add_argument("--rv-nohr", action="store_true", help="E45 echo control N4: mask the run-value loss on actual home runs")
ap.add_argument("--no-foul-dist", action="store_true", help="E42 F1: fouls train only the fair/foul head, no distance")
a = ap.parse_args()
t0 = time.time()
R = ROOT + "data/derived/"
df = pd.read_parquet(a.data)
feats = list(B.FEATS_PHYS)
foul = None
if a.fouls or a.reduced:
    foul = pd.read_parquet(R + "fouls_features.parquet")
    feats = [f for f in feats if f in foul.columns]
    print("reduced feature set:", len(feats), "of", len(B.FEATS_PHYS), "| dropped", [f for f in B.FEATS_PHYS if f not in feats], flush=True)
B.assert_clean(feats, job="mlp_aux2")
raw = pd.read_parquet(R + "exp_features.parquet", columns=["rid", "bb_type", "hc_x", "hc_y", "delta_run_exp", "hit_location", "events", "batter", "pitcher"]).set_index("rid")
if a.sample < 1:
    keep = (df.split != "train") | (np.random.default_rng(0).random(len(df)) < a.sample)
    df = df[keep].reset_index(drop=True)
n_fair = len(df)
if a.fouls:
    foul = foul[foul.split == "train"].copy()
    if a.sample < 1:
        foul = foul[np.random.default_rng(1).random(len(foul)) < a.sample]
    foul["rid"] = -1 - np.arange(len(foul))
    foul["y"] = 0.0
    foul["bearing"] = np.nan  # the foul table's bearing is not a landing bearing: the bearing head must not see it
    cats = [f for f in feats if f in B.CATS]
    for c in cats:
        foul[c] = pd.Categorical(foul[c], categories=df[c].cat.categories)
    cols = list(dict.fromkeys(feats + ["rid", "y", "split", "hit_distance_sc", "bearing", "game_pk"]))
    df = pd.concat([df[cols], foul[cols]], ignore_index=True)
    print("fair rows", n_fair, "foul rows", len(foul), flush=True)
is_fair = np.zeros(len(df), bool)
is_fair[:n_fair] = True
rr = raw.reindex(df.rid.to_numpy())
for c in ("hc_x", "hc_y", "delta_run_exp"):
    df["raw_" + c] = rr[c].to_numpy()
df["raw_bb"] = rr.bb_type.map({"ground_ball": 0, "line_drive": 1, "fly_ball": 2, "popup": 3}).to_numpy()
evmap = {"field_out": 0, "force_out": 0, "grounded_into_double_play": 0, "fielders_choice": 0, "fielders_choice_out": 0, "double_play": 0, "sac_fly": 0, "sac_bunt": 0, "field_error": 0, "single": 1, "double": 2, "triple": 3}
df["raw_loc"] = (pd.to_numeric(rr.hit_location, errors="coerce") - 1).to_numpy()
df["raw_ev"] = rr.events.map(evmap).to_numpy()
fairf_early = is_fair.astype(np.float32)
trfair = (df.split == "train").to_numpy() & is_fair  # statistics and eval bookkeeping use fair train rows only
tr_all = (df.split == "train").to_numpy()  # includes fouls (all fouls are train rows)
va = (df.split == "val").to_numpy() & is_fair
ev = (df.split == "test").to_numpy() & is_fair
import torch
import torch.nn as nn

torch.set_num_threads(10)
Z, C, ncat = B.nn_inputs(df, feats, trfair)
y = df.y.to_numpy(np.float32)
fairf = is_fair.astype(np.float32)


def scaled(col):
    v = df[col].to_numpy(np.float32)
    m = np.isfinite(v)
    mu, sd = float(np.nanmean(v[trfair])), float(np.nanstd(v[trfair])) + 1e-6
    return np.nan_to_num((v - mu) / sd, nan=0.0).astype(np.float32), m.astype(np.float32), mu, sd


ds, dm, dmu, dsd = scaled("hit_distance_sc")
bs, bm, bmu, bsd = scaled("bearing")
hx, hxm, hxmu, hxsd = scaled("raw_hc_x")
hy, hym, hymu, hysd = scaled("raw_hc_y")
rv, rvm, rvmu, rvsd = scaled("raw_delta_run_exp")
bb = np.nan_to_num(df.raw_bb.to_numpy(np.float32), nan=0).astype(np.int64)
bbm = np.isfinite(df.raw_bb.to_numpy(np.float32)).astype(np.float32)
loc = np.nan_to_num(df.raw_loc.to_numpy(np.float32), nan=0).astype(np.int64)
locm = np.isfinite(df.raw_loc.to_numpy(np.float32)).astype(np.float32)
evc = np.nan_to_num(df.raw_ev.to_numpy(np.float32), nan=0).astype(np.int64)
evm = np.isfinite(df.raw_ev.to_numpy(np.float32)).astype(np.float32)
bigv = a.variant in ("all", "everything")
W = {"dist": 0.5, "brg": 0.5, "land": 0.1 if a.variant in ("land", "all", "everything") else 0.0, "rv": 0.1 if bigv else 0.0, "bb": 0.1 if bigv else 0.0,
     "loc": 0.1 if a.variant == "everything" else 0.0, "ev": 0.1 if a.variant == "everything" else 0.0, "park": a.park_w, "ff": 0.1 if a.fouls else 0.0}
W["hr2"] = 0.0
for kv in [s for s in a.w.split(",") if s]:
    k, v = kv.split("=")
    assert k in W, k
    W[k] = float(v)
print("head weights:", W, flush=True)
if a.rv_perm:
    g = np.random.default_rng(11)
    key = (df.y.to_numpy().astype(int) * 10000 + np.clip(np.nan_to_num(df.launch_speed.to_numpy(float)) // 10, 0, 14).astype(int) * 100 + np.clip((np.nan_to_num(df.launch_angle.to_numpy(float)) + 90) // 10, 0, 19).astype(int))
    idx = np.flatnonzero(trfair)
    moved = 0
    for kk in np.unique(key[idx]):
        grp = idx[key[idx] == kk]
        sh = g.permutation(grp)
        rv[grp], rvm[grp] = rv[sh], rvm[sh]
        moved += len(grp)
    print("run-value labels permuted within strata:", moved, "train rows", flush=True)
if a.rv_nohr:
    rvm = rvm * (df.y.to_numpy() < 0.5).astype(np.float32)
if a.no_foul_dist:
    dm = dm * fairf_early
# E41 counterfactual park margins
NP = 30
PM = pm_mask = None
if a.park_w > 0:
    pk = json.load(open(ROOT + "apps/web/public/parks30.json"))
    ang = np.array(pk["bearings"], float)
    bd = df.bearing.to_numpy(float)
    dd = df.hit_distance_sc.to_numpy(float)
    ok = np.isfinite(bd) & np.isfinite(dd)
    bcl = np.clip(np.nan_to_num(bd), -45, 45)
    PM = np.zeros((len(df), NP), np.float32)
    for j, p in enumerate(pk["parks"]):
        PM[:, j] = (dd - np.interp(bcl, ang, np.array(p["dist"], float))) / 30.0
    pm_mask = ok.astype(np.float32)
    PM = np.nan_to_num(PM, nan=0.0)
    print("park heads: mean margin per park (ft) min/max", float(PM[ok].mean(0).min() * 30), float(PM[ok].mean(0).max() * 30), flush=True)
# E43 id codes
ID = None
nid = [1, 1]
if a.ids:
    ID = np.zeros((len(df), 2), np.int64)
    for k, col in enumerate(("batter", "pitcher")):
        v = rr[col].to_numpy(float)
        ser = pd.Series(v[trfair])
        cnt = ser.value_counts()
        keepids = cnt[cnt >= 30].index
        code = {float(i): n + 1 for n, i in enumerate(keepids)}
        ID[:, k] = [code.get(x, 0) if np.isfinite(x) else 0 for x in v]
        nid[k] = len(code) + 1
    print("id embeddings: batters", nid[0], "pitchers", nid[1], flush=True)
hid = [int(x) for x in a.hidden.split(",")]


class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.emb = nn.ModuleList([nn.Embedding(n, min(16, n // 2 + 1)) for n in ncat])
        w = Z.shape[1] + sum(min(16, n // 2 + 1) for n in ncat)
        if a.ids:
            self.idemb = nn.ModuleList([nn.Embedding(n, 8) for n in nid])
            w += 16
        layers, prev = [], w
        for k, h in enumerate(hid):
            layers += [nn.Linear(prev, h), nn.SiLU()]
            if k < len(hid) - 1:
                layers.append(nn.Dropout(a.drop))
            prev = h
        self.body = nn.Sequential(*layers)
        self.hr, self.dist, self.brg = nn.Linear(prev, 1), nn.Linear(prev, 1), nn.Linear(prev, 1)
        self.land, self.rv, self.bb = nn.Linear(prev, 2), nn.Linear(prev, 1), nn.Linear(prev, 4)
        self.loc, self.ev = nn.Linear(prev, 9), nn.Linear(prev, 4)
        self.park, self.ff, self.hr2 = nn.Linear(prev, NP), nn.Linear(prev, 1), nn.Linear(prev, 1)

    def forward(self, z, c, ids=None):
        parts = [z] + [e(c[:, i]) for i, e in enumerate(self.emb)]
        if a.ids:
            for k, e in enumerate(self.idemb):
                v = e(ids[:, k])
                if self.training and a.id_drop > 0:
                    v = v * (torch.rand(v.shape[0], 1) > a.id_drop).float()
                parts.append(v)
        h = self.body(torch.cat(parts, 1))
        return {"p": self.hr(h).squeeze(1), "dist": self.dist(h).squeeze(1), "brg": self.brg(h).squeeze(1), "land": self.land(h), "rv": self.rv(h).squeeze(1),
                "bb": self.bb(h), "loc": self.loc(h), "ev": self.ev(h), "park": self.park(h), "ff": self.ff(h).squeeze(1), "hr2": self.hr2(h).squeeze(1)}


T = lambda x: torch.from_numpy(x)
Zt, Ct, yt, ft = T(Z), T(C), T(y), T(fairf)
IDt = T(ID) if ID is not None else None
tg = dict(ds=T(ds), dm=T(dm), bs=T(bs), bm=T(bm), hx=T(hx), hxm=T(hxm), hy=T(hy), hym=T(hym), rv=T(rv), rvm=T(rvm), bb=T(bb), bbm=T(bbm), loc=T(loc), locm=T(locm), ev=T(evc), evm=T(evm))
if PM is not None:
    tg["pm"], tg["pmm"] = T(PM), T(pm_mask)
bce, huber, ce = nn.BCEWithLogitsLoss(reduction="none"), nn.HuberLoss(reduction="none", delta=0.5), nn.CrossEntropyLoss(reduction="none")


def fwd(net, ii):
    return net(Zt[ii], Ct[ii], IDt[ii] if IDt is not None else None)


def predict(net, idx):
    net.eval()
    out = {k: [] for k in ("p", "dist", "brg", "hx", "hy", "rv", "bb")}
    with torch.no_grad():
        for s in range(0, len(idx), 65536):
            o = fwd(net, idx[s:s + 65536])
            out["p"].append(torch.sigmoid(o["p"]).numpy())
            out["dist"].append(o["dist"].numpy() * dsd + dmu)
            out["brg"].append(o["brg"].numpy() * bsd + bmu)
            out["hx"].append(o["land"][:, 0].numpy() * hxsd + hxmu)
            out["hy"].append(o["land"][:, 1].numpy() * hysd + hymu)
            out["rv"].append(o["rv"].numpy() * rvsd + rvmu)
            out["bb"].append(torch.softmax(o["bb"], 1).numpy())
    return {k: np.concatenate(v) for k, v in out.items()}


def mloss(pred, target, mask):
    return (huber(pred, target) * mask).sum() / (mask.sum() + 1)


def train(tri, seed, eval_sets):
    torch.manual_seed(seed)
    rng = np.random.default_rng(seed)
    net = Net()
    if a.ids:
        emb_p = [p for n, p in net.named_parameters() if n.startswith("idemb")]
        rest = [p for n, p in net.named_parameters() if not n.startswith("idemb")]
        opt = torch.optim.AdamW([{"params": rest, "weight_decay": 1e-5}, {"params": emb_p, "weight_decay": 5e-2}], lr=2e-3)
    else:
        opt = torch.optim.AdamW(net.parameters(), lr=2e-3, weight_decay=1e-5)
    steps = a.epochs * (int(is_fair[tri].sum()) // 4096 + 1)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=a.lr, total_steps=steps)
    vai = np.flatnonzero(va)
    best, best_state, acc, nacc = 9.0, None, None, 0
    for ep in range(a.epochs):
        net.train()
        tfair = tri[is_fair[tri]]
        tfoul = tri[~is_fair[tri]]
        perm = rng.permutation(tfair)
        for s in range(0, len(perm), 4096):
            ii = perm[s:s + 4096]
            if len(tfoul):
                ii = np.concatenate([ii, rng.choice(tfoul, int(round(len(ii) * len(tfoul) / len(tfair))))])
            o = fwd(net, ii)
            fm = ft[ii]
            loss = (bce(o["p"], yt[ii]) * fm).sum() / (fm.sum() + 1) + W["dist"] * mloss(o["dist"], tg["ds"][ii], tg["dm"][ii]) + W["brg"] * mloss(o["brg"], tg["bs"][ii], tg["bm"][ii])
            if W["land"]:
                loss = loss + W["land"] * (mloss(o["land"][:, 0], tg["hx"][ii], tg["hxm"][ii]) + mloss(o["land"][:, 1], tg["hy"][ii], tg["hym"][ii]))
            if W["rv"]:
                loss = loss + W["rv"] * mloss(o["rv"], tg["rv"][ii], tg["rvm"][ii])
            if W["bb"]:
                loss = loss + W["bb"] * (ce(o["bb"], tg["bb"][ii]) * tg["bbm"][ii]).sum() / (tg["bbm"][ii].sum() + 1)
            if W["loc"]:
                loss = loss + W["loc"] * (ce(o["loc"], tg["loc"][ii]) * tg["locm"][ii]).sum() / (tg["locm"][ii].sum() + 1)
            if W["ev"]:
                loss = loss + W["ev"] * (ce(o["ev"], tg["ev"][ii]) * tg["evm"][ii]).sum() / (tg["evm"][ii].sum() + 1)
            if W["park"]:
                pmask = tg["pmm"][ii].unsqueeze(1)
                loss = loss + W["park"] * (huber(o["park"], tg["pm"][ii]) * pmask).sum() / (pmask.sum() * NP + 1)
            if W["hr2"]:
                loss = loss + W["hr2"] * (bce(o["hr2"], yt[ii]) * fm).sum() / (fm.sum() + 1)
            if W["ff"]:
                loss = loss + W["ff"] * bce(o["ff"], 1.0 - fm).mean()
            opt.zero_grad()
            loss.backward()
            opt.step()
            sched.step()
        pv = predict(net, vai)["p"]
        vb = float(np.mean((pv - y[vai]) ** 2))
        print(f"  seed {seed} epoch {ep} val Brier {vb:.5f}", flush=True)
        if a.swa:
            if ep >= a.epochs - a.swa:
                outs = {n: predict(net, ix) for n, ix in eval_sets.items()}
                acc = outs if acc is None else {n: {k: acc[n][k] + outs[n][k] for k in outs[n]} for n in outs}
                nacc += 1
        elif vb < best:
            best, best_state = vb, {k: v.clone() for k, v in net.state_dict().items()}
    if a.swa:
        outs = {n: {k: v / nacc for k, v in acc[n].items()} for n in acc}
        best = float(np.mean((outs["val"]["p"] - y[vai]) ** 2))
    else:
        net.load_state_dict(best_state)
        outs = {n: predict(net, ix) for n, ix in eval_sets.items()}
    return outs, best


def merge(acc, outs, w):
    if acc is None:
        return {n: {k: v * w for k, v in o.items()} for n, o in outs.items()}
    return {n: {k: acc[n][k] + outs[n][k] * w for k in outs[n]} for n in outs}


Path(a.out_dir).mkdir(parents=True, exist_ok=True)
vai, evi = np.flatnonzero(va), np.flatnonzero(ev)
info = {}
if a.oof:
    K = a.oof
    fold = (df.game_pk.fillna(0).astype(int).to_numpy() % K)
    tri_all = np.flatnonzero(tr_all)
    cols = ["mlp_p", "mlp_d", "mlp_b", "mlp_hx", "mlp_hy", "mlp_rv", "mlp_bb0", "mlp_bb1", "mlp_bb2", "mlp_bb3"]
    res = np.full((len(df), len(cols)), np.nan)
    resacc = None
    flat = lambda o: np.column_stack([o["p"], o["dist"], o["brg"], o["hx"], o["hy"], o["rv"], o["bb"]])
    for k in range(K):
        hold = np.flatnonzero(trfair & (fold == k))
        trn = tri_all[~(trfair[tri_all] & (fold[tri_all] == k))]
        for s in range(a.seeds):
            outs, vb = train(trn, 100 * k + s, {"val": vai, "ev": evi, "hold": hold})
            info[f"fold{k}_seed{s}_val_brier"] = vb
            w = 1.0 / (K * a.seeds)
            res[hold] = np.nan_to_num(res[hold]) + flat(outs["hold"]) / a.seeds
            resacc = merge(resacc, {"val": outs["val"], "ev": outs["ev"]}, w)
        print("fold", k, "done", f"{time.time() - t0:.0f}s", flush=True)
    res[vai] = flat(resacc["val"])
    res[evi] = flat(resacc["ev"])
    sel = np.flatnonzero(is_fair)
    out = pd.DataFrame(res[sel], columns=cols)
    out.insert(0, "rid", df.rid.to_numpy()[sel])
    out.to_parquet(Path(a.out_dir) / "mlp_oof.parquet")
    oofm = trfair & np.isfinite(res[:, 0])
    print("oof train Brier of the MLP head:", float(np.mean((res[oofm, 0] - y[oofm]) ** 2)), "val", float(np.mean((res[vai, 0] - y[vai]) ** 2)), "test", float(np.mean((res[evi, 0] - y[evi]) ** 2)))
    print("mlp_oof done", info, f"{time.time() - t0:.0f}s", flush=True)
else:
    acc = None
    tri = np.flatnonzero(tr_all)
    for seed in range(a.seeds):
        outs, vb = train(tri, seed, {"val": vai, "ev": evi})
        acc = merge(acc, {"ev": outs["ev"]}, 1.0 / a.seeds)
        info[f"seed{seed}_val_brier"] = vb
    o = acc["ev"]
    out = pd.DataFrame({"rid": df.rid.to_numpy()[evi], "p_hr": o["p"], "d_hat": o["dist"]})
    out.to_parquet(Path(a.out_dir) / "pred_mlp.parquet")
    print("mlp_aux2 done", info, f"{time.time() - t0:.0f}s", flush=True)
