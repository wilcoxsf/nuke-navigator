"""Experiment E34: a multi-task MLP with many auxiliary heads. The bearing head helped the MLP by itself (0.01337 -> 0.01326, E28). The same ball has more post-contact outcomes in the raw table, and each one is extra supervision
for the shared trunk (training signal only, never an input): landing coordinates (hc_x, hc_y), the run value of the event, the batted-ball type (ground, line, fly, popup) and the projected distance and bearing.
Variants (--variant): bearing (the E28 model, the control), land (bearing + landing coordinates), all (bearing + landing + run value + batted-ball type).
Same architecture, optimizer, three seeds and ten epochs as bakeoff.run_mlp; early-stopped on validation Brier. Auxiliary losses are masked where the label is missing and weighted 0.5 (distance, bearing) or 0.1 (the rest).
Usage: FEATSET=v19 python mlp_aux.py --data data/derived/bakeoff_features_v19.parquet --out-dir data/derived/v34_all --variant all [--sample 0.03]. About 12 minutes per variant."""
import argparse
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
a = ap.parse_args()
t0 = time.time()
df = pd.read_parquet(a.data)
raw = pd.read_parquet(ROOT + "data/derived/exp_features.parquet", columns=["rid", "bb_type", "hc_x", "hc_y", "delta_run_exp", "hit_location", "events"]).set_index("rid").reindex(df.rid)
for c in ("hc_x", "hc_y", "delta_run_exp"):
    df["raw_" + c] = raw[c].to_numpy()
df["raw_bb"] = raw.bb_type.map({"ground_ball": 0, "line_drive": 1, "fly_ball": 2, "popup": 3}).to_numpy()
evmap = {"field_out": 0, "force_out": 0, "grounded_into_double_play": 0, "fielders_choice": 0, "fielders_choice_out": 0, "double_play": 0, "sac_fly": 0, "sac_bunt": 0, "field_error": 0, "single": 1, "double": 2, "triple": 3}
df["raw_loc"] = (pd.to_numeric(raw.hit_location, errors="coerce") - 1).to_numpy()
df["raw_ev"] = raw.events.map(evmap).to_numpy()
if a.sample < 1:
    keep = (df.split != "train") | (np.random.default_rng(0).random(len(df)) < a.sample)
    df = df[keep].reset_index(drop=True)
tr, va, ev = (df.split == "train").to_numpy(), (df.split == "val").to_numpy(), (df.split != "train").to_numpy()
feats = B.FEATS_PHYS
B.assert_clean(feats, job="mlp_aux")
import torch
import torch.nn as nn

torch.set_num_threads(10)
Z, C, ncat = B.nn_inputs(df, feats, tr)
y = df.y.to_numpy(np.float32)


def scaled(col):
    v = df[col].to_numpy(np.float32)
    m = np.isfinite(v)
    mu, sd = float(np.nanmean(v[tr])), float(np.nanstd(v[tr])) + 1e-6
    return np.nan_to_num((v - mu) / sd, nan=0.0).astype(np.float32), m.astype(np.float32), mu, sd


ds, dm, dmu, dsd = scaled("hit_distance_sc")
bs, bm, _, _ = scaled("bearing")
hx, hxm, _, _ = scaled("raw_hc_x")
hy, hym, _, _ = scaled("raw_hc_y")
rv, rvm, _, _ = scaled("raw_delta_run_exp")
bb = np.nan_to_num(df.raw_bb.to_numpy(np.float32), nan=0).astype(np.int64)
bbm = np.isfinite(df.raw_bb.to_numpy(np.float32)).astype(np.float32)
loc = np.nan_to_num(df.raw_loc.to_numpy(np.float32), nan=0).astype(np.int64)
locm = np.isfinite(df.raw_loc.to_numpy(np.float32)).astype(np.float32)
evc = np.nan_to_num(df.raw_ev.to_numpy(np.float32), nan=0).astype(np.int64)
evm = np.isfinite(df.raw_ev.to_numpy(np.float32)).astype(np.float32)
bigv = a.variant in ("all", "everything")
W = {"dist": 0.5, "brg": 0.5, "land": 0.1 if a.variant in ("land", "all", "everything") else 0.0, "rv": 0.1 if bigv else 0.0, "bb": 0.1 if bigv else 0.0, "loc": 0.1 if a.variant == "everything" else 0.0, "ev": 0.1 if a.variant == "everything" else 0.0}


class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.emb = nn.ModuleList([nn.Embedding(n, min(16, n // 2 + 1)) for n in ncat])
        w = Z.shape[1] + sum(min(16, n // 2 + 1) for n in ncat)
        self.body = nn.Sequential(nn.Linear(w, 256), nn.SiLU(), nn.Dropout(0.1), nn.Linear(256, 128), nn.SiLU(), nn.Dropout(0.1), nn.Linear(128, 64), nn.SiLU())
        self.hr, self.dist, self.brg = nn.Linear(64, 1), nn.Linear(64, 1), nn.Linear(64, 1)
        self.land, self.rv, self.bb = nn.Linear(64, 2), nn.Linear(64, 1), nn.Linear(64, 4)
        self.loc, self.ev = nn.Linear(64, 9), nn.Linear(64, 4)

    def forward(self, z, c):
        h = self.body(torch.cat([z] + [e(c[:, i]) for i, e in enumerate(self.emb)], 1))
        return self.hr(h).squeeze(1), self.dist(h).squeeze(1), self.brg(h).squeeze(1), self.land(h), self.rv(h).squeeze(1), self.bb(h), self.loc(h), self.ev(h)


T = lambda x: torch.from_numpy(x)
Zt, Ct, yt = T(Z), T(C), T(y)
tg = dict(ds=T(ds), dm=T(dm), bs=T(bs), bm=T(bm), hx=T(hx), hxm=T(hxm), hy=T(hy), hym=T(hym), rv=T(rv), rvm=T(rvm), bb=T(bb), bbm=T(bbm), loc=T(loc), locm=T(locm), ev=T(evc), evm=T(evm))
tri, vai, evi = np.flatnonzero(tr), np.flatnonzero(va), np.flatnonzero(ev)
bce, huber, ce = nn.BCEWithLogitsLoss(), nn.HuberLoss(reduction="none", delta=0.5), nn.CrossEntropyLoss(reduction="none")


def predict(net, idx):
    net.eval()
    ps, dsx = [], []
    with torch.no_grad():
        for s in range(0, len(idx), 65536):
            ii = idx[s:s + 65536]
            o = net(Zt[ii], Ct[ii])
            ps.append(torch.sigmoid(o[0]).numpy())
            dsx.append(o[1].numpy())
    return np.concatenate(ps), np.concatenate(dsx)


def mloss(pred, target, mask):
    return (huber(pred, target) * mask).sum() / (mask.sum() + 1)


p_acc, d_acc, info = np.zeros(len(evi)), np.zeros(len(evi)), {}
for seed in range(a.seeds):
    torch.manual_seed(seed)
    rng = np.random.default_rng(seed)
    net = Net()
    opt = torch.optim.AdamW(net.parameters(), lr=2e-3, weight_decay=1e-5)
    steps = a.epochs * (len(tri) // 4096 + 1)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=3e-3, total_steps=steps)
    best, best_state = 9.0, None
    for ep in range(a.epochs):
        net.train()
        perm = rng.permutation(tri)
        for s in range(0, len(perm), 4096):
            ii = perm[s:s + 4096]
            o = net(Zt[ii], Ct[ii])
            loss = bce(o[0], yt[ii]) + W["dist"] * mloss(o[1], tg["ds"][ii], tg["dm"][ii]) + W["brg"] * mloss(o[2], tg["bs"][ii], tg["bm"][ii])
            if W["land"]:
                loss = loss + W["land"] * (mloss(o[3][:, 0], tg["hx"][ii], tg["hxm"][ii]) + mloss(o[3][:, 1], tg["hy"][ii], tg["hym"][ii]))
            if W["rv"]:
                loss = loss + W["rv"] * mloss(o[4], tg["rv"][ii], tg["rvm"][ii])
            if W["bb"]:
                loss = loss + W["bb"] * (ce(o[5], tg["bb"][ii]) * tg["bbm"][ii]).sum() / (tg["bbm"][ii].sum() + 1)
            if W["loc"]:
                loss = loss + W["loc"] * (ce(o[6], tg["loc"][ii]) * tg["locm"][ii]).sum() / (tg["locm"][ii].sum() + 1)
            if W["ev"]:
                loss = loss + W["ev"] * (ce(o[7], tg["ev"][ii]) * tg["evm"][ii]).sum() / (tg["evm"][ii].sum() + 1)
            opt.zero_grad()
            loss.backward()
            opt.step()
            sched.step()
        pv, _ = predict(net, vai)
        vb = float(np.mean((pv - y[vai]) ** 2))
        print(f"  seed {seed} epoch {ep} val Brier {vb:.5f}", flush=True)
        if vb < best:
            best, best_state = vb, {k: v.clone() for k, v in net.state_dict().items()}
    net.load_state_dict(best_state)
    pe, de = predict(net, evi)
    p_acc += pe / a.seeds
    d_acc += (de * dsd + dmu) / a.seeds
    info[f"seed{seed}_val_brier"] = best
out = pd.DataFrame({"rid": df.loc[ev, "rid"].to_numpy(), "p_hr": p_acc, "d_hat": d_acc})
Path(a.out_dir).mkdir(parents=True, exist_ok=True)
out.to_parquet(Path(a.out_dir) / "pred_mlp.parquet")
print("mlp_aux", a.variant, "done", info, f"{time.time() - t0:.0f}s", flush=True)
