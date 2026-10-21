"""B3: landing-density model. For every ball that can leave the park, predict where it lands as a 2D cloud over (distance, bearing).

A mixture of K correlated 2D Gaussians whose means start from the physics distance and the direction estimate and are corrected by a neural net
reading the legal features (contact, bat tracking, pitch, weather, park). Trained by maximum likelihood on the balls' real projected distance
and landing bearing. Judged on
  - log-likelihood of the true landing spot on the test period, against a single Gaussian around the same centers;
  - calibration: how often the true distance and bearing fall inside the central 50% and 90% of their predicted marginals (ideal 0.50, 0.90);
  - the home-run probability obtained by sampling the cloud and asking how often a sample clears the fence, scored with Brier against the
    classifier. Fence: five-point profile by park (or, with --wall, the extracted Oracle Park wall profile and a taller-wall allowance for
    Oracle). Two conversions: one fitted wall allowance, and a logistic calibration on the cloud's clearing probabilities at several allowances.
The cloud is also what the seat view needs: it can be sampled, projected on the stands and shown without any accuracy claim.

Foul balls (--fouls, weight --foul-weight): they have a projected distance but no landing coordinates, and they landed outside the lines. Each
contributes the probability of "that distance and foul territory" to the likelihood, so the cloud covers fair and foul ground and the data are no
longer cut off at the lines. Every number for a ball in play is then conditional on the ball being fair (divided by the cloud's fair mass).
Weight 0 loads the fouls but trains on none: the baseline for the same evaluation.

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
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

from bakeoff import FEATS_PHYS, nn_inputs
from features import assert_clean

DIMS = ["dim_left_line", "dim_left_center", "dim_center", "dim_right_center", "dim_right_line"]
ANG = torch.tensor([-45.0, -22.5, 0.0, 22.5, 45.0])
LINE = 45.0           # bearing of the foul lines, degrees
ORACLE = 2395         # venue_id of Oracle Park
TH = (0.0, 5.0, 10.0, 15.0, 20.0, 30.0)  # wall allowances (ft) for the calibrated conversion
SQ2 = math.sqrt(2.0)


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


def foul_nll(params, d):
    """Negative log of (density of the landing distance) x (probability the bearing is outside the lines, given that distance)."""
    logpi, mu_d, mu_b, sd, sb, rho = params
    zd = (d[:, None] - mu_d) / sd
    m, s = mu_b + rho * sb * zd, sb * torch.sqrt(1 - rho**2)  # bearing given distance, per component
    log_out = torch.logaddexp(torch.special.log_ndtr((-LINE - m) / s), torch.special.log_ndtr((m - LINE) / s))
    lp = logpi - 0.5 * math.log(2 * math.pi) - torch.log(sd) - 0.5 * zd**2 + log_out
    return -torch.logsumexp(lp, 1)


def log_fair(params):
    """Log of the cloud's probability of landing between the foul lines."""
    logpi, _, mu_b, _, sb, _ = params
    pf = 0.5 * (torch.erf((LINE - mu_b) / sb / SQ2) - torch.erf((-LINE - mu_b) / sb / SQ2))
    return torch.logsumexp(logpi + torch.log(pf.clamp_min(1e-9)), 1)


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
    ap.add_argument("--fouls", default="", help="foul-ball feature table (foul_features.py)")
    ap.add_argument("--foul-weight", type=float, default=1.0)
    ap.add_argument("--wall", default="", help="extracted Oracle wall profile csv (bearing_deg, wall_ft, height_ft)")
    a = ap.parse_args()
    torch.set_num_threads(10)
    torch.manual_seed(0)
    t0 = time.time()
    assert_clean(FEATS_PHYS, job="density")
    df = pd.read_parquet(a.data.replace("\\", "/"))
    df["is_foul"] = False
    if a.fouls:
        fo = pd.read_parquet(a.fouls.replace("\\", "/"))
        fo["is_foul"], fo["rid"] = True, -1
        df = pd.concat([df, fo[[c for c in df.columns if c in fo.columns]]], ignore_index=True)
        del fo
    foul = df.is_foul.to_numpy()
    region = ((df.launch_speed >= 70) & df.launch_angle.between(8, 55) & df.phys_dist.notna() & df.bearing_hat.notna()).to_numpy()
    lab = (~foul & df.hit_distance_sc.notna() & df.bearing.notna() & df.bearing.abs().le(60)).to_numpy()
    flab = (foul & df.hit_distance_sc.notna() & df.hit_distance_sc.between(50, 600)).to_numpy() if a.fouls else np.zeros(len(df), bool)
    tr, va, te = (df.split == "train").to_numpy(), (df.split == "val").to_numpy(), (df.split == "test").to_numpy()
    if a.sample < 1:
        keep = (~tr) | (np.random.default_rng(0).random(len(df)) < a.sample)
        region = region & keep
    Z, C, ncat = nn_inputs(df, FEATS_PHYS, tr & region & ~foul)
    T = lambda x: torch.from_numpy(np.ascontiguousarray(x))
    Zt, Ct = T(Z), T(C)
    base_d, base_b = T(df.phys_dist.fillna(0).to_numpy(np.float32)), T(df.bearing_hat.fillna(0).to_numpy(np.float32))
    d_t, b_t = T(df.hit_distance_sc.fillna(0).to_numpy(np.float32)), T(df.bearing.fillna(0).to_numpy(np.float32))
    foul_t = T(foul)
    wt_t = T(np.where(foul, a.foul_weight, 1.0).astype(np.float32))
    dims = np.nan_to_num(df[DIMS].to_numpy(np.float32), nan=np.nanmean(df[DIMS].to_numpy(np.float32)))
    dims_t = T(dims)
    use_f = a.fouls and a.foul_weight > 0
    tri = np.flatnonzero(tr & region & (lab | (flab if use_f else False)))
    vai = np.flatnonzero(va & region & (lab | (flab if use_f else False)))
    tri_p, vai_p, tei = np.flatnonzero(tr & region & lab), np.flatnonzero(va & region & lab), np.flatnonzero(te & region & lab)
    tei_f = np.flatnonzero(te & region & flab)
    print(f"density training balls {len(tri_p):,} in play + {len(tri) - len(tri_p):,} fouls, validation {len(vai_p):,} + {len(vai) - len(vai_p):,}, "
          f"test {len(tei):,} + {len(tei_f):,} fouls; {time.time() - t0:.0f}s", flush=True)

    net = MDN(Z.shape[1], ncat, a.components)
    opt = torch.optim.AdamW(net.parameters(), lr=2e-3, weight_decay=1e-5)
    bs = 4096
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=a.epochs * (len(tri) // bs + 1))
    rng = np.random.default_rng(0)

    def run(idx):
        return net(Zt[idx], Ct[idx], base_d[idx], base_b[idx])

    def loss_rows(idx):
        p = run(idx)
        return torch.where(foul_t[idx], foul_nll(p, d_t[idx]), nll(p, d_t[idx], b_t[idx])) * wt_t[idx]

    best, best_state = 1e9, None
    for ep in range(a.epochs):
        net.train()
        perm = rng.permutation(tri)
        for s in range(0, len(perm), bs):
            ii = perm[s:s + bs]
            loss = loss_rows(ii).mean()
            opt.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(net.parameters(), 5.0)
            opt.step()
            sched.step()
        net.eval()
        with torch.no_grad():
            v = float(np.concatenate([loss_rows(vai[i:i + 8192]).numpy() for i in range(0, len(vai), 8192)]).mean())
        print(f"epoch {ep} validation loss {v:.4f} {time.time() - t0:.0f}s", flush=True)
        if v < best:
            best, best_state = v, {k: x.clone() for k, x in net.state_dict().items()}
    net.load_state_dict(best_state)
    net.eval()

    # evaluation on the test period; every in-play number is conditional on the ball being fair
    base_sd = float(np.std((df.hit_distance_sc - df.phys_dist).to_numpy()[tri_p]))
    base_sb = float(np.std((df.bearing - df.bearing_hat).to_numpy()[tri_p]))
    with torch.no_grad():
        nl, lf = [], []
        for i in range(0, len(tei), 8192):
            ii = tei[i:i + 8192]
            p = run(ii)
            lf.append(log_fair(p).numpy())
            nl.append(nll(p, d_t[ii], b_t[ii]).numpy())
        nl, lf = np.concatenate(nl), np.concatenate(lf)
        nl_fair = nl + lf  # density of the landing spot given the ball is fair
        # single-Gaussian baseline around the same centers (physics distance and direction estimate), spreads fitted on training residuals
        zd = (d_t[tei] - base_d[tei]).numpy() / base_sd
        zb = (b_t[tei] - base_b[tei]).numpy() / base_sb
        nl0 = 0.5 * (zd**2 + zb**2) + math.log(2 * math.pi) + math.log(base_sd) + math.log(base_sb)
        pit_d, pit_b = [], []
        for i in range(0, len(tei), 8192):
            ii = tei[i:i + 8192]
            logpi, mu_d, mu_b, sd, sb, rho = run(ii)
            pit_d.append((logpi.exp() * 0.5 * (1 + torch.erf((d_t[ii][:, None] - mu_d) / sd / SQ2))).sum(1).numpy())
            pit_b.append((logpi.exp() * 0.5 * (1 + torch.erf((b_t[ii][:, None] - mu_b) / sb / SQ2))).sum(1).numpy())
        # test fouls: distance density times the chance of foul ground, and the cloud's fair mass on fouls against balls in play
        fl, pf_f = [], []
        for i in range(0, len(tei_f), 8192):
            ii = tei_f[i:i + 8192]
            p = run(ii)
            fl.append(foul_nll(p, d_t[ii]).numpy())
            pf_f.append(log_fair(p).exp().numpy())
        fl, pf_f = (np.concatenate(fl), np.concatenate(pf_f)) if len(tei_f) else (np.array([np.nan]), np.array([]))
    pd_, pb_ = np.concatenate(pit_d), np.concatenate(pit_b)
    cov = lambda p, lo, hi: float(((p >= lo) & (p <= hi)).mean())
    auc = float(roc_auc_score(np.r_[np.zeros(len(pf_f)), np.ones(len(tei))], np.r_[pf_f, np.exp(lf)])) if len(pf_f) else float("nan")

    # fence: five-point profile, or for Oracle Park the extracted wall (distance by bearing) plus the extra distance a taller wall demands
    is_sf = (df.venue_id.to_numpy() == ORACLE) if "venue_id" in df.columns else np.zeros(len(df), bool)
    if a.wall:
        wl = pd.read_csv(a.wall.replace("\\", "/"))
        wl_t = T(np.interp(np.arange(-47, 48), wl.bearing_deg, wl.wall_ft).astype(np.float32))
        h_ft = float(np.interp(0.0, wl.bearing_deg, wl.height_ft))
        hp = np.interp(np.arange(-47, 48), wl.bearing_deg, wl.height_ft).astype(np.float32)
        hp_t = T(hp)
        descent = np.deg2rad(np.clip(df.launch_angle.to_numpy(np.float32) + 8.0, 25.0, 60.0))  # descent angle: launch angle plus a drag allowance (assumption)
        desc_t = T(np.tan(descent).astype(np.float32))
    sf_t = T(is_sf)

    def margins(idx, S=200):
        """Sampled landing distance minus the fence, and whether the sample landed fair."""
        m_out = np.empty((len(idx), S), np.float32)
        f_out = np.empty((len(idx), S), bool)
        with torch.no_grad():
            for i in range(0, len(idx), 2048):
                ii = idx[i:i + 2048]
                ds, bs_ = sample(run(ii), S)
                fence = fence_at(dims_t[ii], bs_)
                if a.wall:
                    k = (bs_.clamp(-47, 47) + 47).round().long()
                    extra = (hp_t[k] - 8.0).clamp_min(0.0) / desc_t[ii][:, None]
                    fence = torch.where(sf_t[ii][:, None], wl_t[k] + extra, fence)
                m_out[i:i + len(ii)] = (ds - fence).numpy()
                f_out[i:i + len(ii)] = (bs_.abs() < LINE).numpy()
        return m_out, f_out

    soft = lambda m, th: 1 / (1 + np.exp(-(m - th) / 2.0))
    p_fair = lambda f: np.clip(f.mean(1), 1e-3, 1.0)
    mv, fv = margins(vai_p)
    yv = df.y.to_numpy()[vai_p]
    best_th, best_ll = 0.0, 1e9
    for th in np.arange(0.0, 40.1, 1.0):
        p = np.clip((soft(mv, th) * fv).mean(1) / p_fair(fv), 1e-6, 1 - 1e-6)
        ll = -(yv * np.log(p) + (1 - yv) * np.log(1 - p)).mean()
        if ll < best_ll:
            best_th, best_ll = th, ll
    mt, ft_ = margins(tei)
    pt = (soft(mt, best_th) * ft_).mean(1) / p_fair(ft_)
    yt = df.y.to_numpy()[tei]

    # calibrated conversion: logistic regression on the cloud's clearing probability at several allowances, fitted on the validation period
    lg = lambda p: np.log(np.clip(p, 1e-4, 1 - 1e-4) / (1 - np.clip(p, 1e-4, 1 - 1e-4)))
    feat = lambda m, f: np.stack([lg((soft(m, th) * f).mean(1) / p_fair(f)) for th in TH], 1)
    cal = LogisticRegression(C=1.0, max_iter=500).fit(feat(mv, fv), yv)
    pc = cal.predict_proba(feat(mt, ft_))[:, 1]

    nall = int(te.sum() - te[foul].sum())  # in-play test balls; those outside the region carry no home runs and are scored as probability zero
    xg = pd.read_parquet(Path(a.pred_dir) / "pred_xgb.parquet").set_index("rid")
    px = xg.p_hr.reindex(df.rid.to_numpy()[tei]).to_numpy()
    near = (df.hit_distance_sc.to_numpy()[tei] >= 330) & (df.hit_distance_sc.to_numpy()[tei] <= 430)
    sf = is_sf[tei]
    se = lambda p: ((p - yt) ** 2).sum() / nall
    row = lambda name, p: f"| {name} | {se(p):.5f} | {((p - yt) ** 2)[near].mean():.4f} | {((p - yt) ** 2)[sf].mean():.4f} |"
    L = ["# B3: landing-density model", "",
         f"Mixture of {a.components} correlated Gaussians over (distance, bearing), centered on physics distance and the direction estimate. Trained on "
         f"{len(tri_p):,} balls in play" + (f" and {len(tri) - len(tri_p):,} foul balls (weight {a.foul_weight:g})" if use_f else "") +
         f"; scored on {len(tei):,} test balls in play (2025-06-01 on)" + ("; fence = extracted Oracle wall (bearing profile and height allowance) for Oracle Park" if a.wall else "") + ".", "",
         "| Measure (balls in play, conditional on fair) | Single Gaussian (same centers) | Landing-density model |", "|---|---|---|",
         f"| Mean negative log-likelihood of the true landing spot | {nl0.mean():.3f} | {nl_fair.mean():.3f} |",
         f"| Distance inside the central 50% / 90% (ideal 0.50 / 0.90) | | {cov(pd_, .25, .75):.3f} / {cov(pd_, .05, .95):.3f} |",
         f"| Bearing inside the central 50% / 90% (ideal 0.50 / 0.90) | | {cov(pb_, .25, .75):.3f} / {cov(pb_, .05, .95):.3f} |",
         f"| Mean fair-ground probability: balls in play / test fouls | | {float(np.exp(lf).mean()):.3f} / {float(pf_f.mean()) if len(pf_f) else float('nan'):.3f} |",
         f"| Fair against foul, AUC of the cloud's fair probability ({len(tei_f):,} test fouls) | | {auc:.3f} |",
         f"| Foul balls: mean negative log of (distance density x foul-ground probability) | | {float(np.nanmean(fl)):.3f} |", "",
         f"Home-run probability from the cloud (global wall allowance {best_th:.0f} ft fitted on validation; calibrated = logistic on clearing probability at {TH} ft):", "",
         "| Model | HR Brier (all test balls) | Near the wall | Oracle Park |", "|---|---|---|---|",
         row("XGBoost classifier (same balls)", px), row("Cloud, one fitted allowance", pt), row("Cloud, calibrated", pc)]
    Path(a.out).write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
