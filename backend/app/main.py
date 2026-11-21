"""API de la Montana Rusa Vectorial.

POST /api/track    -> pista dibujada (puntos de control -> spline cubico)
POST /api/formula  -> pista escrita como r(t) (SymPy deriva exacto)
Ambas devuelven, para cada muestra: r, r', r'', T, N, B, kappa, s, rapidez fisica,
a_T, a_N, fuerza G y tiempo.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .geometry import arc_length, frenet
from .physics import simulate
from .spline import cubic_spline
from .symbolic import formula_curve

app = FastAPI(title="Montana Rusa Vectorial")


class Fisica(BaseModel):
    v0: float = Field(3.0, ge=0, le=60, description="rapidez inicial (m/s)")
    mu: float = Field(0.0, ge=0, le=0.5, description="coeficiente de friccion simplificado")
    samples: int = Field(700, ge=50, le=3000)


class TrackRequest(Fisica):
    points: list[list[float]]
    closed: bool = True


class FormulaRequest(Fisica):
    x: str
    y: str
    z: str
    t0: float = 0.0
    t1: float = 6.283185307179586


def _lista(a: np.ndarray) -> list:
    return np.round(a, 5).tolist()


def construir(t, R, D1, D2, closed: bool, v0: float, mu: float) -> dict:
    T, N, B, kappa, speed = frenet(D1, D2)
    s_param = arc_length(t, speed)
    longitud = float(s_param[-1])

    if closed:
        # La ultima muestra repite la primera. El carrito arranca en el punto mas alto.
        n = len(t) - 1
        start = int(np.argmax(R[:n, 2]))
        idx = np.r_[np.arange(start, n), np.arange(0, start), start]
        s = s_param[idx] - s_param[start]
        s[s < 0] += longitud
        s[-1] = longitud
    else:
        start = 0
        idx = np.arange(len(t))
        s = s_param

    t, R, D1, D2 = t[idx], R[idx], D1[idx], D2[idx]
    T, N, B, kappa = T[idx], N[idx], B[idx], kappa[idx]
    v, aT, aN, gforce, time, stall = simulate(s, R[:, 2], T, N, kappa, v0, mu)

    pasado = slice(0, stall) if stall is not None else slice(None)
    return {
        "t": _lista(t), "s": _lista(s), "pos": _lista(R), "d1": _lista(D1), "d2": _lista(D2),
        "T": _lista(T), "N": _lista(N), "B": _lista(B), "kappa": _lista(kappa),
        "v": _lista(v), "aT": _lista(aT), "aN": _lista(aN), "g": _lista(gforce), "time": _lista(time),
        "summary": {
            "closed": closed,
            "length": round(longitud, 3),
            "maxKappa": round(float(kappa.max()), 5),
            "minRadius": round(float(1 / kappa.max()), 3) if kappa.max() > 1e-9 else None,
            "maxG": round(float(gforce[pasado].max()), 3),
            "maxSpeed": round(float(v.max()), 3),
            "duration": round(float(time[-1]), 3),
            "stallIndex": stall,
            "startT": round(float(t[0]), 5),
        },
    }


@app.post("/api/track")
def track(req: TrackRequest):
    try:
        t, R, D1, D2 = cubic_spline(req.points, req.closed, req.samples)
        return construir(t, R, D1, D2, req.closed, req.v0, req.mu)
    except (ValueError, np.linalg.LinAlgError) as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/formula")
def formula(req: FormulaRequest):
    try:
        t, R, D1, D2, latex = formula_curve(req.x, req.y, req.z, req.t0, req.t1, req.samples)
        closed = bool(np.linalg.norm(R[0] - R[-1]) < 1e-6 and np.linalg.norm(D1[0] - D1[-1]) < 1e-6)
        data = construir(t, R, D1, D2, closed, req.v0, req.mu)
        data["latex"] = latex
        return data
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/health")
def health():
    return {"ok": True}


# Si existe el frontend compilado (npm run build), FastAPI lo sirve en "/".
_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if _dist.is_dir():
    app.mount("/", StaticFiles(directory=_dist, html=True), name="frontend")
