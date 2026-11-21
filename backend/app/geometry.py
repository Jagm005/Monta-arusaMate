"""Geometria diferencial de curvas: triedro de Frenet, curvatura y longitud de arco.

Formulas del curso (seccion "Rectas, curvas y curvatura"):
    T = r' / |r'|
    B = (r' x r'') / |r' x r''|
    N = B x T
    kappa = |r' x r''| / |r'|^3
    s(t) = integral de |r'(u)| du
"""
from __future__ import annotations

import numpy as np

EPS = 1e-9
KAPPA_MIN = 1e-6  # por debajo de esto la curva es practicamente una recta


def _perpendicular(v: np.ndarray) -> np.ndarray:
    eje = np.eye(3)[np.argmin(np.abs(v))]
    p = np.cross(v, eje)
    return p / np.linalg.norm(p)


def frenet(D1: np.ndarray, D2: np.ndarray):
    speed = np.linalg.norm(D1, axis=1)
    if np.any(speed < EPS):
        raise ValueError("r'(t) = 0 en algun punto: la curva no es suave ahi (el carrito se detendria en el parametro).")
    T = D1 / speed[:, None]
    C = np.cross(D1, D2)
    cn = np.linalg.norm(C, axis=1)
    kappa = cn / speed**3

    N = np.zeros_like(D1)
    B = np.zeros_like(D1)
    ok = kappa > KAPPA_MIN
    B[ok] = C[ok] / cn[ok, None]
    N[ok] = np.cross(B[ok], T[ok])

    # En tramos rectos (kappa = 0) N no esta definido: tomamos el del vecino mas cercano.
    malos = np.where(~ok)[0]
    buenos = np.where(ok)[0]
    for i in malos:
        if buenos.size:
            j = buenos[np.argmin(np.abs(buenos - i))]
            n = N[j] - np.dot(N[j], T[i]) * T[i]
            nn = np.linalg.norm(n)
            n = n / nn if nn > 1e-6 else _perpendicular(T[i])
        else:
            n = _perpendicular(T[i])
        N[i] = n
        B[i] = np.cross(T[i], n)
    return T, N, B, kappa, speed


def arc_length(t: np.ndarray, speed: np.ndarray) -> np.ndarray:
    """s(t) acumulada con la regla del trapecio."""
    ds = 0.5 * (speed[1:] + speed[:-1]) * np.diff(t)
    return np.concatenate([[0.0], np.cumsum(ds)])
