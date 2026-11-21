"""API del proyecto. El navegador manda la pista y Python devuelve los calculos.

POST /api/track    -> pista dibujada con puntos
POST /api/formula  -> pista escrita como r(t) = x(t) i + y(t) j + z(t) k
"""
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .geometry import angulo_entre, longitud_acumulada, tangente_y_curvatura
from .spline import cubic_spline
from .symbolic import formula_curve

app = FastAPI(title="Montana rusa - Matematicas 3")
MUESTRAS = 700


class Pista(BaseModel):
    points: list[list[float]]
    closed: bool = True


class Formula(BaseModel):
    x: str
    y: str
    z: str
    t0: float = 0
    t1: float = 6.283185307179586


def lista(a):
    return np.round(a, 5).tolist()


def calcular(t, r, r1, r2, cerrada):
    T, kappa, rapidez = tangente_y_curvatura(r1, r2)
    s = longitud_acumulada(t, rapidez)
    k_max = float(kappa.max())
    return {
        "t": lista(t), "s": lista(s), "pos": lista(r), "d1": lista(r1), "d2": lista(r2),
        "T": lista(T), "kappa": lista(kappa), "speed": lista(rapidez),
        "angle": angulo_entre(r1, r2),
        "summary": {
            "closed": cerrada,
            "length": round(float(s[-1]), 3),
            "maxKappa": round(k_max, 5),
            "minRadius": round(1 / k_max, 3) if k_max > 1e-9 else None,
            "t0": float(t[0]),
            "t1": float(t[-1]),
        },
    }


@app.post("/api/track")
def track(p: Pista):
    try:
        t, r, r1, r2 = cubic_spline(p.points, p.closed, MUESTRAS)
        return calcular(t, r, r1, r2, p.closed)
    except (ValueError, np.linalg.LinAlgError) as e:
        raise HTTPException(400, str(e))


@app.post("/api/formula")
def formula(f: Formula):
    try:
        t, r, r1, r2, latex = formula_curve(f.x, f.y, f.z, f.t0, f.t1, MUESTRAS)
        cerrada = bool(np.allclose(r[0], r[-1], atol=1e-6) and np.allclose(r1[0], r1[-1], atol=1e-6))
        datos = calcular(t, r, r1, r2, cerrada)
        datos["latex"] = latex
        return datos
    except ValueError as e:
        raise HTTPException(400, str(e))


# si ya se compilo el frontend (npm run build), lo servimos aqui mismo
carpeta = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if carpeta.is_dir():
    app.mount("/", StaticFiles(directory=carpeta, html=True), name="frontend")
