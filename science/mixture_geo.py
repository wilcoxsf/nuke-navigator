"""GPT brief 7, question 2, phases A and B (25 Oct 2026): a joint (bearing, distance) mixture density from the legal features, then the home-run probability as an integral over the park's fence profile, used only as a guarded correction to the finished net.
  Phase A  one net, legal v37 features in, K bivariate Gaussian components over (landing bearing in degrees, projected distance in feet) out, plus a logit for "lands fair" (|bearing| <= 45). Trained on the train period with the mixture likelihood (bearing label noise sigma 4 degrees,
           distance masked where missing); early-stopped on the validation likelihood. K=1 is the control for "does the mixture matter".
  Phase B  p_geo = P(fair) * integral over bearings of sum_k pi_k N(b) * Phi((mu_d|b - fence(b)) / sigma_d|b), the fence being the park-and-year five-point profile (LF line at -45, LC at -22.5, CF, RC at +22.5, RF line at +45 degrees, straight lines between).
           It ignores the wall height (a low drive to the wall counts as a home run), so it is NOT used alone: p_final = sigmoid(logit p_base + eta (logit p_geo - logit p_base)) with eta, and a two-input logistic stack, fitted on the VALIDATION rows only and scored once on test.
Usage: FEATSET=v37 python science/mixture_geo.py --k 5 --base data/derived/e49a_wide/pred_mlp.parquet --tag k5 [--epochs 8 --threads 4]"""
import argparse
import os
import time

os.environ.setdefault("FEATSET", "v37")
import numpy as np
import pandas as pd

import bakeoff as B

ap = argparse.ArgumentParser()
ap.add_argument("--k", type=int, default=5)
ap.add_argument("--epochs", type=int, default=8)
ap.add_argument("--threads", type=int, default=4)
ap.add_argument("--base", required=True)
ap.add_argument("--tag", required=True)
ap.add_argument("--data", default="C:/Users/andrewwi/dev/nuke-navigator-new/data/derived/bakeoff_features_v37.parquet")
ap.add_argument("--sample", type=float, default=1.0)
a = ap.parse_args()
import torch
import torch.nn as nn
import torch.nn.functional as F

torch.set_num_threads(a.threads)
torch.manual_seed(0)
np.random.seed(0)
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
t0 = time.time()
df = pd.read_parquet(a.data)
df = df[df.split != "drop"].reset_index(drop=True) if "drop" in set(df.split.unique()) else df
if a.sample < 1:
    df = df[(df.split != "train") | (np.random.default_rng(0).random(len(df)) < a.sample)].reset_index(drop=True)
feats = list(B.FEATS_PHYS)
B.assert_clean(feats, job="mixture_geo")
tr = (df.split == "train").to_numpy()
va = (df.split == "val").to_numpy()
te = (df.split == "test").to_numpy()
Z, C, ncat = B.nn_inputs(df, feats, tr)
bearing = df.bearing.to_numpy(np.float32)
dist = df.hit_distance_sc.to_numpy(np.float32)
mb = np.isfinite(bearing) & (np.abs(np.nan_to_num(bearing)) <= 45)  # fair-territory bearings train the density
md = np.isfinite(dist) & mb
fair_lab = (np.abs(np.nan_to_num(bearing, nan=999)) <= 45).astype(np.float32)
fair_ok = np.isfinite(bearing)
dims = df[["dim_left_line", "dim_left_center", "dim_center", "dim_right_center", "dim_right_line"]].to_numpy(np.float32)
dims = np.where(np.isfinite(dims), dims, np.nanmedian(dims, 0))
y = df.y.to_numpy(np.float32)
print("rows", len(df), "train", tr.sum(), "density bearing labels", mb[tr].sum(), "distance labels", md[tr].sum(), "load %.0fs" % (time.time() - t0), flush=True)
SQ2PI = (2 * np.pi) ** 0.5


class Net(nn.Module):
    def __init__(self, nz, ncat, K, width=192):
        super().__init__()
        self.K = K
        self.emb = nn.ModuleList([nn.Embedding(n, min(16, n // 2 + 1)) for n in ncat])
        d = nz + sum(min(16, n // 2 + 1) for n in ncat)
        self.trunk = nn.Sequential(nn.Linear(d, width), nn.SiLU(), nn.Dropout(0.05), nn.Linear(width, width), nn.SiLU(), nn.Dropout(0.05), nn.Linear(width, 128), nn.SiLU())
        self.head = nn.Linear(128, K * 6 + 1)
        with torch.no_grad():
            self.head.bias.zero_()
            hb = self.head.bias[:K * 6].view(K, 6)
            hb[:, 1] = torch.randn(K) * 0.4
            hb[:, 2] = torch.linspace(-0.6, 0.6, K)

    def forward(self, z, c):
        h = torch.cat([z] + [e(c[:, i]) for i, e in enumerate(self.emb)], 1)
        o = self.head(self.trunk(h))
        fair = o[:, -1]
        a_ = o[:, :-1].view(-1, self.K, 6)
        return a_[..., 0], 45.0 * torch.tanh(a_[..., 1]), 300.0 + 500.0 * torch.tanh(a_[..., 2]), 2.0 + 30.0 * torch.sigmoid(a_[..., 3]), 6.0 + 120.0 * torch.sigmoid(a_[..., 4]), 0.95 * torch.tanh(a_[..., 5]), fair


def nll(par, b, d, mb_, md_, lab_sigma=4.0):
    wl, mu_b, mu_d, sb, sd, rho, _ = par
    wlog = F.log_softmax(wl, -1)
    sbo = torch.sqrt(sb.square() + lab_sigma ** 2)
    rho_o = rho * (sb / sbo)
    zb, zd = (b[:, None] - mu_b) / sbo, (d[:, None] - mu_d) / sd
    nb = 0.5 * zb.square() + sbo.log() + np.log(SQ2PI)
    nd = 0.5 * zd.square() + sd.log() + np.log(SQ2PI)
    den = (1 - rho_o.square()).clamp_min(0.01)
    both = 0.5 * (zb.square() + zd.square() - 2 * rho_o * zb * zd) / den + sbo.log() + sd.log() + 0.5 * den.log() + np.log(2 * np.pi)
    term = torch.where((mb_ & md_)[:, None], both, torch.where(mb_[:, None], nb, nd))
    good = mb_ | md_
    return -(torch.logsumexp(wlog - term, 1) * good).sum() / good.sum().clamp_min(1)


GRID = torch.linspace(-45, 45, 91)  # 1 degree steps


def fence_profile(dm):
    """five-point profile (LF line -45, LC -22.5, CF 0, RC 22.5, RF line 45) interpolated on GRID: [n, G]"""
    xs = torch.tensor([-45.0, -22.5, 0.0, 22.5, 45.0])
    idx = torch.clamp(torch.bucketize(GRID, xs) - 1, 0, 3)
    x0, x1 = xs[idx], xs[idx + 1]
    w = ((GRID - x0) / (x1 - x0))[None, :]
    return dm[:, idx] * (1 - w) + dm[:, idx + 1] * w


def p_geo(par, fence):
    wl, mu_b, mu_d, sb, sd, rho, fair = par
    z = (GRID[None, None, :] - mu_b[..., None]) / sb[..., None]
    bpdf = torch.exp(-0.5 * z.square()) / (SQ2PI * sb[..., None])
    dc = mu_d[..., None] + (rho * sd)[..., None] * z
    sdc = sd[..., None] * torch.sqrt((1 - rho.square()).clamp_min(0.01))[..., None]
    surv = torch.special.ndtr((dc - fence[:, None, :]) / sdc)
    cell = (torch.softmax(wl, -1)[..., None] * bpdf * surv).sum(1)
    return (torch.sigmoid(fair) * cell.sum(-1) * 1.0).clamp(1e-6, 1 - 1e-6)  # grid spacing is 1 degree


Zt, Ct = torch.from_numpy(Z), torch.from_numpy(C)
bt, dt = torch.from_numpy(np.nan_to_num(bearing)), torch.from_numpy(np.nan_to_num(dist))
mbt, mdt = torch.from_numpy(mb), torch.from_numpy(md)
fl, fo = torch.from_numpy(fair_lab), torch.from_numpy(fair_ok.astype(np.float32))
net = Net(Z.shape[1], ncat, a.k)
opt = torch.optim.Adam(net.parameters(), lr=2e-3, weight_decay=1e-6)
tri = np.flatnonzero(tr)
nb_ = len(tri) // 2048
sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=3e-3, total_steps=a.epochs * nb_)


def evaluate(mask):
    net.eval()
    idx = np.flatnonzero(mask)
    tot, n = 0.0, 0
    with torch.no_grad():
        for s in range(0, len(idx), 8192):
            j = torch.from_numpy(idx[s:s + 8192])
            par = net(Zt[j], Ct[j])
            tot += nll(par, bt[j], dt[j], mbt[j], mdt[j]).item() * len(j)
            n += len(j)
    net.train()
    return tot / n


best, best_state = 1e9, None
for ep in range(a.epochs):
    perm = np.random.permutation(tri)
    run = 0.0
    for s in range(nb_):
        j = torch.from_numpy(perm[s * 2048:(s + 1) * 2048])
        par = net(Zt[j], Ct[j])
        fair_loss = (F.binary_cross_entropy_with_logits(par[-1], fl[j], reduction="none") * fo[j]).sum() / fo[j].sum().clamp_min(1)
        loss = nll(par, bt[j], dt[j], mbt[j], mdt[j]) + 0.5 * fair_loss
        opt.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(net.parameters(), 2.0)
        opt.step()
        sched.step()
        run += loss.item()
    v = evaluate(va)
    print("epoch %d train loss %.3f val density nll %.3f %.0fs" % (ep, run / nb_, v, time.time() - t0), flush=True)
    if v < best:
        best, best_state = v, {k: x.clone() for k, x in net.state_dict().items()}
net.load_state_dict(best_state)
net.eval()
print("best val density nll %.4f (K=%d)" % (best, a.k), flush=True)
# Phase B: p_geo on val and test rows, and the density's calibration on the 330 to 430 ft subset of fair balls
pg = np.full(len(df), np.nan, np.float32)
cover = {0.5: [], 0.8: [], 0.95: []}
dmae = []
with torch.no_grad():
    for mask in (va, te):
        idx = np.flatnonzero(mask)
        for s in range(0, len(idx), 2048):
            j = idx[s:s + 2048]
            jt = torch.from_numpy(j)
            par = net(Zt[jt], Ct[jt])
            pg[j] = p_geo(par, fence_profile(torch.from_numpy(dims[j]))).numpy()
            if mask is te:  # distance interval coverage from the mixture's CDF at the true distance (near-wall subset)
                wl, mu_b, mu_d, sb, sd, rho, fair = par
                w = torch.softmax(wl, -1)
                ok = torch.from_numpy(md[j] & (dist[j] >= 330) & (dist[j] <= 430))
                if ok.any():
                    cdf = (w * torch.special.ndtr((dt[jt][:, None] - mu_d) / sd)).sum(1)
                    for q in cover:
                        lo, hi = (1 - q) / 2, 1 - (1 - q) / 2
                        cover[q].append(((cdf >= lo) & (cdf <= hi))[ok].float().numpy())
                    dmae.append(torch.abs(dt[jt] - (w * mu_d).sum(1))[ok].numpy())
print("distance interval coverage on test fair balls with true distance 330 to 430 ft (nominal -> actual):", {q: round(float(np.concatenate(v).mean()), 3) for q, v in cover.items()}, "| mean-distance MAE %.1f ft" % np.concatenate(dmae).mean(), flush=True)
rid = df.rid.to_numpy()
out = pd.DataFrame({"rid": rid, "p_geo": pg})[va | te]
od = ROOT + "data/derived/mixture_%s/" % a.tag
os.makedirs(od, exist_ok=True)
out.to_parquet(od + "p_geo.parquet")
# score: geometry alone, the guarded interpolation and a two-input logistic stack, with everything fitted on validation only
base = pd.read_parquet(a.base).set_index("rid").p_hr
d2 = out.set_index("rid").join(base, how="inner").dropna()
sp = df.set_index("rid").split
d2["split"] = sp.reindex(d2.index).to_numpy()
d2["y"] = df.set_index("rid").y.reindex(d2.index).to_numpy()
lg = lambda p: np.log(np.clip(p, 1e-6, 1 - 1e-6) / (1 - np.clip(p, 1e-6, 1 - 1e-6)))
sg = lambda z: 1 / (1 + np.exp(-z))
v_, t_ = d2[d2.split == "val"], d2[d2.split == "test"]
br = lambda p, yy: float(((p - yy) ** 2).mean())
print("test Brier: base %.5f | geometry alone %.5f" % (br(t_.p_hr, t_.y), br(t_.p_geo, t_.y)))
etas = np.linspace(0, 1, 41)
vb = [br(sg(lg(v_.p_hr) + e * (lg(v_.p_geo) - lg(v_.p_hr))), v_.y) for e in etas]
eta = float(etas[int(np.argmin(vb))])
pf = sg(lg(t_.p_hr) + eta * (lg(t_.p_geo) - lg(t_.p_hr)))
print("eta (best on validation) %.3f: validation Brier %.5f -> %.5f; test Brier %.5f (base %.5f)" % (eta, vb[0], min(vb), br(pf, t_.y), br(t_.p_hr, t_.y)))
from sklearn.linear_model import LogisticRegression
clf = LogisticRegression(C=1e4, max_iter=2000).fit(np.c_[lg(v_.p_hr), lg(v_.p_geo)], v_.y)
ps = clf.predict_proba(np.c_[lg(t_.p_hr), lg(t_.p_geo)])[:, 1]
print("two-input logistic stack (validation fit): weights base %.3f geometry %.3f, test Brier %.5f" % (clf.coef_[0, 0], clf.coef_[0, 1], br(ps, t_.y)))
for name, p in (("eta", pf), ("stack", ps)):
    os.makedirs(od + name, exist_ok=True)
    pd.DataFrame({"rid": t_.index.to_numpy(), "p_hr": np.asarray(p)}).to_parquet(od + name + "/pred.parquet")
print("done %.0fs" % (time.time() - t0))
