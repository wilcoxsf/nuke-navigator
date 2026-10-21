"""B3: landing-density model. For every ball that can leave the park, predict where it lands as a 2D cloud over (distance, bearing).

A mixture of K correlated 2D Gaussians whose means start from the physics distance and the direction estimate and are corrected by a neural net
reading the legal features (contact, bat tracking, pitch, weather, park). Trained by maximum likelihood on the balls' real projected distance
and landing bearing. Judged on
  - log-likelihood of the true landing spot on the test period, against a single Gaussian around the same centers;
  - calibration: how often the true distance and bearing fall inside the central 50% and 90% of their predicted marginals (ideal 0.50, 0.90);
  - the home-run probability obtained by sampling the cloud and asking how often a sample clears the fence (five-point fence profile by park,
    plus one fitted wall allowance), scored with Brier against the classifier.
The cloud is also what the seat view needs: it can be sampled, projected on the stands and shown without any accuracy claim.

Usage: FEATSET=v2 python density.py --data data/derived/bakeoff_features_v3.parquet --pred-dir data/derived/bakeoff_v2 --out science/density_results.md
"""
from __future__ import annotations

import argparse
import math
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F

from bakeoff import FEATS_PHYS, nn_inputs
from features import assert_clean

DIMS = ["dim_left_line", "dim_left_center", "dim_center", "dim_right_center", "dim_right_line"]
ANG = torch.tensor([-45.0, -22.5, 0.0, 22.5, 45.0])


class MDN(nn.Module):
    def __init__(self, nz, ncat, K):
        super().__init__()
        self.K = K
        self.emb = nn.ModuleList([nn.Embedding(n, min(16, n // 2 + 1)) for n in ncat])
        w = nz + sum(min(16, n // 2 + 1) for n in ncat)
        self.body = nn.Sequential(nn.Linear(w, 256), nn.SiLU(), nn.Dropout(0.1), nn.Linear(256, 128), nn.SiLU(), nn.Dropout(0.1), nn.Linear(128, 64), nn.SiLU())
        self.head = nn.Linear(64, 6 * K)
        nn.init.normal_(self.head.weight, std=0.01)
        nn.init.zeros_(self.head.bias)

    def forward(self, z, c, base_d, base_b):
        h = self.body(torch.cat([z] + [e(c[:, i]) for i, e in enumerate(self.emb)], 1))
        o = self.head(h).view(-1, 6, self.K)
        logpi = F.log_softmax(o[:, 0], 1)
        mu_d = base_d[:, None] + 20.0 * torch.tanh(o[:, 1])
        mu_b = base_b[:, None] + 8.0 * torch.tanh(o[:, 2])
        sd = F.softplus(o[:, 3] + 12.0) + 3.0       # starts near 15 ft
        sb = F.softplus(o[:, 4] + 7.5) + 1.0        # starts near 8 degrees
        rho = 0.95 * torch.tanh(o[:, 5])
        return logpi, mu_d, mu_b, sd, sb, rho


def nll(params, d, b):
    logpi, mu_d, mu_b, sd, sb, rho = params
    zd, zb = (d[:, None] - mu_d) / sd, (b[:, None] - mu_b) / sb
    q = (zd**2 - 2 * rho * zd * zb + zb**2) / (1 - rho**2)
    lp = logpi - math.log(2 * math.pi) - torch.log(sd) - torch.log(sb) - 0.5 * torch.log(1 - rho**2) - 0.5 * q
    return -torch.logsumexp(lp, 1)


def sample(params, S):
    logpi, mu_d, mu_b, sd, sb, rho = params
    n, K = mu_d.shape
    comp = torch.multinomial(logpi.exp(), S, replacement=True)  # (n, S)
    g = lambda t: torch.gather(t, 1, comp)
    z1, z2 = torch.randn(n, S), torch.randn(n, S)
    r = g(rho)
    d = g(mu_d) + g(sd) * z1
    b = g(mu_b) + g(sb) * (r * z1 + torch.sqrt(1 - r**2) * z2)
    return d, b


def fence_at(dims, b):
    bc = b.clamp(-45, 45)
    idx = torch.clamp(torch.floor((bc + 45) / 22.5).long(), 0, 3)
    lo = torch.gather(dims, 1, idx)
    hi = torch.gather(dims, 1, idx + 1)
    frac = (bc - ANG[idx]) / 22.5
    return lo * (1 - frac) + hi * frac


def main() -> None:
    ap = argparse.ArgumentParser()
    for k in ("data", "pred_dir", "out"):
        ap.add_argument(f"--{k.replace('_', '-')}", required=True)
    ap.add_argument("--epochs", type=int, default=12)
    ap.add_argument("--components", type=int, default=4)
    ap.add_argument("--sample", type=float, default=1.0)
    a = ap.parse_args()
    torch.set_num_threads(10)
    torch.manual_seed(0)
    t0 = time.time()
    assert_clean(FEATS_PHYS, job="density")
    df = pd.read_parquet(a.data.replace("\\", "/"))
    region = ((df.launch_speed >= 70) & df.launch_angle.between(8, 55) & df.phys_dist.notna() & df.bearing_hat.notna()).to_numpy()
    lab = (df.hit_distance_sc.notna() & df.bearing.notna() & df.bearing.abs().le(60)).to_numpy()
    tr, va, te = (df.split == "train").to_numpy(), (df.split == "val").to_numpy(), (df.split == "test").to_numpy()
    if a.sample < 1:
        keep = (~tr) | (np.random.default_rng(0).random(len(df)) < a.sample)
        region = region & keep
    Z, C, ncat = nn_inputs(df, FEATS_PHYS, tr & region)
    T = lambda x: torch.from_numpy(np.ascontiguousarray(x))
    Zt, Ct = T(Z), T(C)
    base_d, base_b = T(df.phys_dist.fillna(0).to_numpy(np.float32)), T(df.bearing_hat.fillna(0).to_numpy(np.float32))
    d_t, b_t = T(df.hit_distance_sc.fillna(0).to_numpy(np.float32)), T(df.bearing.fillna(0).to_numpy(np.float32))
    dims = np.nan_to_num(df[DIMS].to_numpy(np.float32), nan=np.nanmean(df[DIMS].to_numpy(np.float32)))
    dims_t = T(dims)
    tri, vai = np.flatnonzero(tr & region & lab), np.flatnonzero(va & region & lab)
    print(f"density training balls {len(tri):,}, validation {len(vai):,}, test {int((te & region & lab).sum()):,}; {time.time() - t0:.0f}s", flush=True)

    net = MDN(Z.shape[1], ncat, a.components)
    opt = torch.optim.AdamW(net.parameters(), lr=2e-3, weight_decay=1e-5)
    bs = 4096
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=a.epochs * (len(tri) // bs + 1))
    rng = np.random.default_rng(0)

    def run(idx):
        return net(Zt[idx], Ct[idx], base_d[idx], base_b[idx])

    best, best_state = 1e9, None
    for ep in range(a.epochs):
        net.train()
        perm = rng.permutation(tri)
        for s in range(0, len(perm), bs):
            ii = perm[s:s + bs]
            loss = nll(run(ii), d_t[ii], b_t[ii]).mean()
            opt.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(net.parameters(), 5.0)
            opt.step()
            sched.step()
        net.eval()
        with torch.no_grad():
            v = float(np.mean([nll(run(vai[i:i + 8192]), d_t[vai[i:i + 8192]], b_t[vai[i:i + 8192]]).mean().item() for i in range(0, len(vai), 8192)]))
        print(f"epoch {ep} validation NLL {v:.4f} {time.time() - t0:.0f}s", flush=True)
        if v < best:
            best, best_state = v, {k: x.clone() for k, x in net.state_dict().items()}
    net.load_state_dict(best_state)
    net.eval()

    # evaluation on the test period
    tei = np.flatnonzero(te & region & lab)
    base_sd = float(np.std((df.hit_distance_sc - df.phys_dist).to_numpy()[tri]))
    base_sb = float(np.std((df.bearing - df.bearing_hat).to_numpy()[tri]))
    with torch.no_grad():
        nl = np.concatenate([nll(run(tei[i:i + 8192]), d_t[tei[i:i + 8192]], b_t[tei[i:i + 8192]]).numpy() for i in range(0, len(tei), 8192)])
        # single-Gaussian baseline around the same centers (physics distance and direction estimate), spreads fitted on training residuals
        zd = (d_t[tei] - base_d[tei]).numpy() / base_sd
        zb = (b_t[tei] - base_b[tei]).numpy() / base_sb
        nl0 = 0.5 * (zd**2 + zb**2) + math.log(2 * math.pi) + math.log(base_sd) + math.log(base_sb)
        pit_d, pit_b = [], []
        for i in range(0, len(tei), 8192):
            ii = tei[i:i + 8192]
            logpi, mu_d, mu_b, sd, sb, rho = run(ii)
            pit_d.append((logpi.exp() * 0.5 * (1 + torch.erf((d_t[ii][:, None] - mu_d) / sd / math.sqrt(2)))).sum(1).numpy())
            pit_b.append((logpi.exp() * 0.5 * (1 + torch.erf((b_t[ii][:, None] - mu_b) / sb / math.sqrt(2)))).sum(1).numpy())
    pd_, pb_ = np.concatenate(pit_d), np.concatenate(pit_b)
    cov = lambda p, lo, hi: float(((p >= lo) & (p <= hi)).mean())

    def margins(idx, S=200):
        out = np.empty((len(idx), S), np.float32)
        with torch.no_grad():
            for i in range(0, len(idx), 2048):
                ii = idx[i:i + 2048]
                ds, bs_ = sample(run(ii), S)
                out[i:i + len(ii)] = (ds - fence_at(dims_t[ii], bs_)).numpy()
        return out

    mv = margins(vai)
    yv = df.y.to_numpy()[vai]
    best_th, best_ll = 0.0, 1e9
    for th in np.arange(0.0, 40.1, 1.0):
        p = np.clip((1 / (1 + np.exp(-(mv - th) / 2.0))).mean(1), 1e-6, 1 - 1e-6)
        ll = -(yv * np.log(p) + (1 - yv) * np.log(1 - p)).mean()
        if ll < best_ll:
            best_th, best_ll = th, ll
    mt = margins(tei)
    pt = (1 / (1 + np.exp(-(mt - best_th) / 2.0))).mean(1)
    yt = df.y.to_numpy()[tei]
    nall = int(te.sum())
    se_density = ((pt - yt) ** 2).sum() / nall  # balls outside the region carry no home runs and are scored as probability zero
    xg = pd.read_parquet(Path(a.pred_dir) / "pred_xgb.parquet").set_index("rid")
    px = xg.p_hr.reindex(df.rid.to_numpy()[tei]).to_numpy()
    se_xgb_same = ((px - yt) ** 2).sum() / nall
    near = (df.hit_distance_sc.to_numpy()[tei] >= 330) & (df.hit_distance_sc.to_numpy()[tei] <= 430)
    sf = (df.home_team.astype(str).to_numpy()[tei] == "SF")
    L = ["# B3: landing-density model", "",
         f"Mixture of {a.components} correlated Gaussians over (distance, bearing), centered on physics distance and the direction estimate, trained on {len(tri):,} balls "
         f"that can leave the park, scored on {len(tei):,} test balls (2025-06-01 on).", "",
         "| Measure | Single Gaussian (same centers) | Landing-density model |", "|---|---|---|",
         f"| Mean negative log-likelihood of the true landing spot | {nl0.mean():.3f} | {nl.mean():.3f} |",
         f"| Distance inside the central 50% / 90% (ideal 0.50 / 0.90) | | {cov(pd_, .25, .75):.3f} / {cov(pd_, .05, .95):.3f} |",
         f"| Bearing inside the central 50% / 90% (ideal 0.50 / 0.90) | | {cov(pb_, .25, .75):.3f} / {cov(pb_, .05, .95):.3f} |", "",
         f"Home-run probability from the cloud (wall allowance {best_th:.0f} ft fitted on validation; fence = five-point park profile):", "",
         "| Model | HR Brier (all test balls) | Region-only subset | Near the wall | Oracle Park |", "|---|---|---|---|---|",
         f"| XGBoost classifier (same balls) | {se_xgb_same:.5f} | | {((px - yt) ** 2)[near].mean():.4f} | {((px - yt) ** 2)[sf].mean():.4f} |",
         f"| Cloud-derived | {se_density:.5f} | | {((pt - yt) ** 2)[near].mean():.4f} | {((pt - yt) ** 2)[sf].mean():.4f} |"]
    Path(a.out).write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
