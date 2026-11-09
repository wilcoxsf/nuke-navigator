"""Model store for the production pipeline (9 Nov 2026). Every research script fits its models in place and keeps only predictions; to score new games we need
the fitted models themselves. Wrap each fit:

    from modelstore import fit as sfit
    m = sfit("carry/fold2", m, lambda m: m.fit(X, y, ...))

NN_STORE_MODE unset: plain research behavior (fit, save nothing). save: fit and write the fitted object under NN_STORE/<key>.pkl (torch nets: .pt state dicts
through save_torch / load_torch). load: skip the fit and return the stored object (the eval sets and early stopping are not needed).
NN_D, when set, is the derived-data directory scripts read and write instead of data/derived/ (the production run writes to data/prod/ so the research
tables are never overwritten): use modelstore.D in place of a hard-coded ROOT + "data/derived/"."""
import os
import pickle
from pathlib import Path

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
D = os.environ.get("NN_D", ROOT + "data/derived/").replace("\\", "/").rstrip("/") + "/"
MODE = os.environ.get("NN_STORE_MODE", "")
STORE = Path(os.environ.get("NN_STORE", ROOT + "data/prod/models"))


def _path(key, ext=".pkl"):
    p = STORE / (key + ext)
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def fit(key, model, fit_fn=None):
    """Fit (or, in load mode, load) one model; returns the fitted object. fit_fn(model) must return the fitted model (sklearn-style .fit returns self)."""
    if MODE == "load":
        with open(_path(key), "rb") as f:
            return pickle.load(f)
    m = fit_fn(model) if fit_fn is not None else model
    if m is None:
        m = model
    if MODE == "save":
        with open(_path(key), "wb") as f:
            pickle.dump(m, f, protocol=pickle.HIGHEST_PROTOCOL)
    return m


def put(key, obj):
    """Save any small object (scalers, weights, column lists) in save mode."""
    if MODE == "save":
        with open(_path(key), "wb") as f:
            pickle.dump(obj, f, protocol=pickle.HIGHEST_PROTOCOL)


def get(key):
    with open(_path(key), "rb") as f:
        return pickle.load(f)


def save_torch(key, net, extra=None):
    if MODE == "save":
        import torch
        torch.save({"state": net.state_dict(), "extra": extra}, _path(key, ".pt"))


def load_torch(key, net):
    import torch
    ck = torch.load(_path(key, ".pt"), map_location="cpu", weights_only=False)
    net.load_state_dict(ck["state"])
    return net, ck.get("extra")


if os.environ.get("NN_NICE") == "1":  # (daytime runs: below-normal priority, so the laptop stays usable)
    try:
        import psutil
        psutil.Process(os.getpid()).nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
    except Exception:
        pass

loading = MODE == "load"
saving = MODE == "save"
