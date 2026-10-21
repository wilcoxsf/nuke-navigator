"""Differentiable-physics entrant for the bake-off.

A neural net reads the legal features (contact, bat tracking, pitch, weather, history, estimated direction, park) and adjusts a
physical flight model around a prior:
  backspin  = college-teacher spin + a bounded correction (+/- 800 rpm)
  drag and lift multipliers = exp(+/- 20%) around the college-fitted aerodynamics
A torch RK4 simulator (vertical plane, backspin lift, air density from the game's weather) turns that into a landing distance, and
the home-run probability is sigmoid((distance - fence at the estimated direction - offset) / tau(x)) + a small learned residual logit.
Trained end to end on home-run labels and Statcast projected distance. Balls outside launch angle 8-55 or under 70 mph skip the
physics and use the residual logit alone.

Usage: python diffphys.py --data data/derived/bakeoff_features.parquet --college ... --params ... --out-dir data/derived/bakeoff [--sample 0.1]
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F

from bakeoff import L4, nn_inputs
from bakeoff_data import college_teacher
from features import assert_clean
from flight_fit import AREA, FT, G, MASS, MPH, RAD, RPM
from flight_transfer import GROUP, GRP_DTYPE

EXTRA = ["fence_hat", "park_lf", "park_cf", "park_rf"]
DFEATS = L4 + EXTRA
DT, NSTEP = 0.1, 80


def simulate_torch(p, v0, theta, wb, rho, md, ml, z0=1.0):
    """RK4 in the vertical plane with backspin lift. Returns landing distance (m), hang time (s), landed flag."""
    q = 0.5 * rho * AREA / MASS
    sgn = torch.sign(wb)
    wmag = wb.abs() + 1e-6
    y, z = torch.zeros_like(v0), torch.full_like(v0, z0)
    vy, vz = v0 * torch.cos(theta), v0 * torch.sin(theta)

    def acc(vy, vz):
        sp = torch.sqrt(vy * vy + vz * vz) + 1e-6
        S = RAD * wmag / sp
        cd = (p[0] + p[1] * S) * md
        cl = p[2] * S / (1 + p[3] * S) * ml
        return -q * cd * sp * vy - q * cl * sp * vz * sgn, -q * cd * sp * vz + q * cl * sp * vy * sgn - G

    Y, Z = [y], [z]
    for _ in range(NSTEP):
        a1y, a1z = acc(vy, vz)
        v2y, v2z = vy + 0.5 * DT * a1y, vz + 0.5 * DT * a1z
        a2y, a2z = acc(v2y, v2z)
        v3y, v3z = vy + 0.5 * DT * a2y, vz + 0.5 * DT * a2z
        a3y, a3z = acc(v3y, v3z)
        v4y, v4z = vy + DT * a3y, vz + DT * a3z
        a4y, a4z = acc(v4y, v4z)
        y = y + DT / 6 * (vy + 2 * v2y + 2 * v3y + v4y)
        z = z + DT / 6 * (vz + 2 * v2z + 2 * v3z + v4z)
        vy = vy + DT / 6 * (a1y + 2 * a2y + 2 * a3y + a4y)
        vz = vz + DT / 6 * (a1z + 2 * a2z + 2 * a3z + a4z)
        Y.append(y)
        Z.append(z)
    Y, Z = torch.stack(Y), torch.stack(Z)
    cross = Z[1:] < 0
    landed = cross.any(0)
    k = torch.argmax(cross.int(), dim=0)
    idx = torch.arange(len(k))
    z0_, z1_ = Z[k, idx], Z[k + 1, idx]
    f = z0_ / (z0_ - z1_ + 1e-9)
    dist = Y[k, idx] + f * (Y[k + 1, idx] - Y[k, idx])
    return dist, (k.float() + f) * DT, landed


class DPNet(nn.Module):
    def __init__(self, nz, ncat, p0):
        super().__init__()
        self.emb = nn.ModuleList([nn.Embedding(n, min(16, n // 2 + 1)) for n in ncat])
        w = nz + sum(min(16, n // 2 + 1) for n in ncat)
        self.body = nn.Sequential(nn.Linear(w, 256), nn.SiLU(), nn.Dropout(0.1), nn.Linear(256, 128), nn.SiLU(), nn.Dropout(0.1), nn.Linear(128, 64), nn.SiLU())
        self.spin, self.md, self.ml, self.tau, self.g = (nn.Linear(64, 1) for _ in range(5))
        for h in (self.spin, self.md, self.ml):
            nn.init.zeros_(h.weight)
            nn.init.zeros_(h.bias)
        nn.init.zeros_(self.tau.weight)
        nn.init.constant_(self.tau.bias, 12.99)  # softplus(12.99) + 3 = 16 ft
        nn.init.normal_(self.g.weight, std=0.01)
        nn.init.zeros_(self.g.bias)  # balls outside the physics window get a fixed -6 offset in forward()
        self.logp = nn.Parameter(torch.log(torch.tensor(p0, dtype=torch.float32)))
        self.off = nn.Parameter(torch.tensor(20.0))

    def forward(self, z, c, fence, v0, theta, rho, spin_c, inm):
        h = self.body(torch.cat([z] + [e(c[:, i]) for i, e in enumerate(self.emb)], 1))
        g = self.g(h).squeeze(1)
        tau = F.softplus(self.tau(h).squeeze(1)) + 3.0
        spin = spin_c + 800.0 * torch.tanh(self.spin(h).squeeze(1))
        md = torch.exp(0.2 * torch.tanh(self.md(h).squeeze(1)))
        ml = torch.exp(0.2 * torch.tanh(self.ml(h).squeeze(1)))
        logit = g - 6.0
        dist_ft = torch.full_like(g, float("nan"))
        landed = torch.zeros_like(g, dtype=torch.bool)
        if inm.any():
            d, _, ok = simulate_torch(torch.exp(self.logp), v0[inm], theta[inm], spin[inm] * RPM, rho[inm], md[inm], ml[inm])
            df_ = d / FT
            dist_ft[inm] = df_
            landed[inm] = ok
            logit[inm] = (df_ - fence[inm] - self.off) / tau[inm] + g[inm]
        return logit, dist_ft, landed, spin, md, ml


def main() -> None:
    ap = argparse.ArgumentParser()
    for k in ("data", "college", "params", "out_dir"):
        ap.add_argument(f"--{k.replace('_', '-')}", required=True)
    ap.add_argument("--sample", type=float, default=1.0)
    ap.add_argument("--epochs", type=int, default=8)
    ap.add_argument("--seeds", type=int, default=1)
    ap.add_argument("--name", default="diffphys")
    a = ap.parse_args()
    torch.set_num_threads(10)
    t0 = time.time()
    df = pd.read_parquet(a.data.replace("\\", "/"))
    if a.sample < 1:
        df = df[(df.split != "train") | (np.random.default_rng(0).random(len(df)) < a.sample)].reset_index(drop=True)
    assert_clean(DFEATS, job="diffphys")
    tr, va, ev = (df.split == "train").to_numpy(), (df.split == "val").to_numpy(), (df.split != "train").to_numpy()
    cfg = json.load(open(a.params))
    p0, sign = cfg["params"], cfg["sign"]

    inm = df.phys_dist.notna().to_numpy()
    teach = college_teacher(a.college.replace("\\", "/"), sign)
    spin_c = np.zeros(len(df), np.float32)
    ii = np.flatnonzero(inm)
    sub = df.iloc[ii]
    mx = pd.DataFrame({"ExitSpeed": sub.launch_speed.to_numpy(), "Angle": sub.launch_angle.to_numpy(), "RelSpeed": sub.release_speed.to_numpy(),
                       "side_r": sub.stand_r.to_numpy(),
                       "grp": pd.Categorical(sub.pitch_type.astype(str).map(GROUP).fillna("other").astype(str), dtype=GRP_DTYPE)})
    spin_c[ii] = (teach["w_back"].predict(mx) / RPM).astype(np.float32)  # rpm
    print(f"teacher spin ready {time.time() - t0:.0f}s", flush=True)

    Z, C, ncat = nn_inputs(df, DFEATS, tr)
    T = lambda x: torch.from_numpy(np.ascontiguousarray(x))
    Zt, Ct = T(Z), T(C)
    y = T(df.y.to_numpy(np.float32))
    fence = T(df.fence_hat.fillna(df.fence_hat.median()).to_numpy(np.float32))
    v0 = T((df.launch_speed.to_numpy() * MPH).astype(np.float32))
    theta = T(np.deg2rad(df.launch_angle.to_numpy()).astype(np.float32))
    rho = T(df.air_density.fillna(df.air_density.median()).to_numpy(np.float32))
    sc = T(spin_c)
    inmt = torch.from_numpy(inm)
    dist = df.hit_distance_sc.to_numpy(np.float32)
    dm = T((~np.isnan(dist)).astype(np.float32))
    dl = T(np.nan_to_num(dist, nan=0.0))

    def run_rows(net, idx):
        net.eval()
        with torch.no_grad():
            lg, dd, _, _, _, _ = net(Zt[idx], Ct[idx], fence[idx], v0[idx], theta[idx], rho[idx], sc[idx], inmt[idx])
        return torch.sigmoid(lg).numpy(), dd.numpy()

    tri, vai, evi = np.flatnonzero(tr), np.flatnonzero(va), np.flatnonzero(ev)
    p_acc, d_acc, info = np.zeros(len(evi)), np.zeros(len(evi)), {}
    for seed in range(a.seeds):
        torch.manual_seed(seed)
        rng = np.random.default_rng(seed)
        net = DPNet(Z.shape[1], ncat, p0)
        phys = [net.logp, net.off]
        opt = torch.optim.AdamW([{"params": [q for n, q in net.named_parameters() if n not in ("logp", "off")], "lr": 2e-3, "weight_decay": 1e-5},
                                 {"params": phys, "lr": 5e-3, "weight_decay": 0.0}])
        bs = 4096
        steps = a.epochs * (len(tri) // bs + 1)
        sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=steps)
        best, best_state = 9.0, None
        for ep in range(a.epochs):
            net.train()
            perm = rng.permutation(tri)
            for s in range(0, len(perm), bs):
                b = perm[s:s + bs]
                lg, dd, landed, spin, md, ml = net(Zt[b], Ct[b], fence[b], v0[b], theta[b], rho[b], sc[b], inmt[b])
                loss = F.binary_cross_entropy_with_logits(lg, y[b])
                m = inmt[b] & landed & (dm[b] > 0)
                if m.any():
                    loss = loss + F.huber_loss(dd[m] / 20.0, dl[b][m] / 20.0, delta=1.0)
                im = inmt[b]
                if im.any():
                    loss = loss + 0.05 * (((spin[im] - sc[b][im]) / 800.0) ** 2).mean() + 0.5 * ((torch.log(md[im])) ** 2 + (torch.log(ml[im])) ** 2).mean()
                opt.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(net.parameters(), 5.0)
                opt.step()
                sched.step()
                if (s // bs) % 50 == 0:
                    print(f"  seed {seed} ep {ep} step {s // bs} loss {float(loss):.4f} {time.time() - t0:.0f}s", flush=True)
            pv = np.concatenate([run_rows(net, vai[i:i + 8192])[0] for i in range(0, len(vai), 8192)])
            vb = float(np.mean((pv - y.numpy()[vai]) ** 2))
            print(f"seed {seed} epoch {ep} val Brier {vb:.5f} (offset {float(net.off):.1f} ft, params {np.round(torch.exp(net.logp).detach().numpy(), 3).tolist()}) {time.time() - t0:.0f}s", flush=True)
            if vb < best:
                best, best_state = vb, {k: v.clone() for k, v in net.state_dict().items()}
        net.load_state_dict(best_state)
        outs = [run_rows(net, evi[i:i + 8192]) for i in range(0, len(evi), 8192)]
        p_acc += np.concatenate([o[0] for o in outs]) / a.seeds
        d_acc += np.concatenate([o[1] for o in outs]) / a.seeds
        info[f"seed{seed}_val_brier"] = best
        info[f"seed{seed}_phys_params"] = torch.exp(net.logp).detach().numpy().round(4).tolist()
        info[f"seed{seed}_offset_ft"] = float(net.off)
    out_dir = Path(a.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    pd.DataFrame({"rid": df.loc[ev, "rid"].to_numpy(), "p_hr": p_acc, "d_hat": d_acc}).to_parquet(out_dir / f"pred_{a.name}.parquet")
    print(a.name, "done", info, f"{time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
