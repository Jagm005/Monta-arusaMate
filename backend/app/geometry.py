"""Calculos de la curva (tema: Rectas, curvas y curvatura).

Formulas que usamos (las del taller):
    rapidez = |r'(t)|
    T(t)    = r'(t) / |r'(t)|                  vector tangente unitario
    kappa   = |r'(t) x r''(t)| / |r'(t)|^3      curvatura (usa producto cruz)
    L       = integral de |r'(t)| dt            longitud de la curva
    cos(angulo entre v y a) = (v . a) / (|v| |a|)   (producto punto)
"""
import numpy as np


def tangente_y_curvatura(d1, d2):
    rapidez = np.linalg.norm(d1, axis=1)
    if np.any(rapidez < 1e-9):
        raise ValueError("En algun punto r'(t) = 0, la curva no es suave ahi.")
    T = d1 / rapidez[:, None]
    cruz = np.cross(d1, d2)
    kappa = np.linalg.norm(cruz, axis=1) / rapidez**3
    return T, kappa, rapidez


def longitud_acumulada(t, rapidez):
    # integral de |r'(t)| con la regla del trapecio
    pedazos = 0.5 * (rapidez[1:] + rapidez[:-1]) * np.diff(t)
    return np.concatenate([[0.0], np.cumsum(pedazos)])


def angulo_entre(v, a):
    """Angulo (en grados) entre la velocidad y la aceleracion en cada punto."""
    norma_v = np.linalg.norm(v, axis=1)
    norma_a = np.linalg.norm(a, axis=1)
    angulos = []
    for i in range(len(v)):
        if norma_a[i] < 1e-9:
            angulos.append(None)  # si a = 0 no hay angulo
        else:
            c = np.dot(v[i], a[i]) / (norma_v[i] * norma_a[i])
            angulos.append(round(float(np.degrees(np.arccos(np.clip(c, -1, 1)))), 3))
    return angulos
