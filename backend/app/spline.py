"""Spline cubico C2 que convierte los puntos dibujados en una funcion vectorial r(t).

Cada tramo entre dos puntos de control es un polinomio cubico en t, asi que
r(t), r'(t) y r''(t) existen y son CONTINUAS en toda la pista. Eso es lo que
hace que la curvatura (que depende de r'') no pegue saltos.

El parametro t es "longitud de cuerda": la distancia en linea recta acumulada
entre puntos de control. No es la longitud de arco exacta (esa se calcula con
la integral de |r'(t)| en geometry.py), pero se le parece bastante.
"""
from __future__ import annotations

import numpy as np


def _knots(points: np.ndarray, closed: bool) -> np.ndarray:
    pts = np.vstack([points, points[:1]]) if closed else points
    h = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    if np.any(h < 1e-6):
        raise ValueError("Hay dos puntos de control repetidos seguidos; muevelos un poco.")
    return np.concatenate([[0.0], np.cumsum(h)])


def _second_derivatives(y: np.ndarray, h: np.ndarray, closed: bool) -> np.ndarray:
    """Resuelve el sistema lineal del spline para las segundas derivadas M_i."""
    n = len(y)
    A = np.zeros((n, n))
    rhs = np.zeros((n, y.shape[1]))
    if closed:
        for i in range(n):
            hp, hn = h[i - 1], h[i]  # tramo anterior y siguiente (ciclico)
            A[i, (i - 1) % n] += hp
            A[i, i] += 2 * (hp + hn)
            A[i, (i + 1) % n] += hn
            rhs[i] = 6 * ((y[(i + 1) % n] - y[i]) / hn - (y[i] - y[i - 1]) / hp)
    else:
        A[0, 0] = A[-1, -1] = 1.0  # spline natural: r''=0 en los extremos
        for i in range(1, n - 1):
            hp, hn = h[i - 1], h[i]
            A[i, i - 1] = hp
            A[i, i] = 2 * (hp + hn)
            A[i, i + 1] = hn
            rhs[i] = 6 * ((y[i + 1] - y[i]) / hn - (y[i] - y[i - 1]) / hp)
    return np.linalg.solve(A, rhs)


def cubic_spline(points: list[list[float]], closed: bool, samples: int):
    """Devuelve t, r(t), r'(t), r''(t) muestreados (incluye el extremo final)."""
    P = np.asarray(points, dtype=float)
    if P.ndim != 2 or P.shape[1] != 3:
        raise ValueError("Cada punto debe tener 3 coordenadas (x, y, z).")
    minimo = 3 if closed else 2
    if len(P) < minimo:
        raise ValueError(f"Se necesitan al menos {minimo} puntos para esta pista.")

    knots = _knots(P, closed)
    h = np.diff(knots)
    M = _second_derivatives(P, h, closed)
    Y = np.vstack([P, P[:1]]) if closed else P
    MM = np.vstack([M, M[:1]]) if closed else M

    t = np.linspace(0.0, knots[-1], samples)
    seg = np.clip(np.searchsorted(knots, t, side="right") - 1, 0, len(h) - 1)
    hi = h[seg][:, None]
    A = ((knots[seg + 1] - t) / h[seg])[:, None]
    B = 1.0 - A
    yi, yj, mi, mj = Y[seg], Y[seg + 1], MM[seg], MM[seg + 1]

    R = A * yi + B * yj + ((A**3 - A) * mi + (B**3 - B) * mj) * hi**2 / 6
    D1 = (yj - yi) / hi - (3 * A**2 - 1) / 6 * hi * mi + (3 * B**2 - 1) / 6 * hi * mj
    D2 = A * mi + B * mj
    return t, R, D1, D2
