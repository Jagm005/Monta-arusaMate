"""Fisica del carrito: energia, aceleracion tangencial/normal y fuerzas G.

Conservacion de energia (con friccion simplificada mu):
    v(s)^2 = v0^2 + 2 g (z0 - z(s)) - 2 mu g s

Descomposicion de la aceleracion (curso: componentes de la aceleracion):
    a = a_T T + a_N N,   a_T = dv/dt = -g T_z - mu g,   a_N = kappa v^2

Fuerza G que siente el pasajero: |a - g_vec| / g, con g_vec = (0, 0, -g).
"""
from __future__ import annotations

import numpy as np

G = 9.81


def simulate(s, z, T, N, kappa, v0: float, mu: float):
    v2 = v0**2 + 2 * G * (z[0] - z) - 2 * mu * G * s
    bad = np.where(v2[1:] <= 0)[0]
    stall = int(bad[0] + 1) if bad.size else None
    v = np.sqrt(np.clip(v2, 0.0, None))

    aT = -G * T[:, 2] - mu * G
    aN = kappa * v**2
    a = aT[:, None] * T + aN[:, None] * N
    felt = a + np.array([0.0, 0.0, G])
    gforce = np.linalg.norm(felt, axis=1) / G

    vavg = np.maximum(0.5 * (v[1:] + v[:-1]), 1e-3)
    dt = np.diff(s) / vavg
    time = np.concatenate([[0.0], np.cumsum(dt)])
    if stall is not None:
        time[stall:] = time[stall]
        aN[stall:] = 0.0
        gforce[stall:] = 1.0
    return v, aT, aN, gforce, time, stall
