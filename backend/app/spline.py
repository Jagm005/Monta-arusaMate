"""Convierte los puntos que dibuja el usuario en una funcion vectorial r(t).

Entre cada par de puntos ponemos un polinomio de grado 3 (spline cubico) para
x(t), y(t) y z(t). Asi la curva queda suave y se puede derivar dos veces, que
es lo que necesitamos para la velocidad r'(t) y la aceleracion r''(t).
"""
import numpy as np

# El carrito de una pista dibujada va a 15 m/s (54 km/h). Asi t queda en segundos.
VELOCIDAD = 15.0


def cubic_spline(points, closed, samples):
    P = np.asarray(points, dtype=float)
    minimo = 3 if closed else 2
    if P.ndim != 2 or P.shape[1] != 3:
        raise ValueError("Cada punto debe tener 3 coordenadas (x, y, z).")
    if len(P) < minimo:
        raise ValueError(f"Se necesitan al menos {minimo} puntos.")

    Y = np.vstack([P, P[:1]]) if closed else P
    h = np.linalg.norm(np.diff(Y, axis=0), axis=1)  # distancia entre puntos seguidos
    if np.any(h < 1e-6):
        raise ValueError("Hay dos puntos repetidos seguidos, mueve uno.")
    nudos = np.concatenate([[0.0], np.cumsum(h)])

    # Sistema de ecuaciones para las segundas derivadas M en cada punto
    n = len(P)
    A = np.zeros((n, n))
    b = np.zeros((n, 3))
    if closed:
        for i in range(n):
            ha, hs = h[i - 1], h[i]
            A[i, (i - 1) % n] += ha
            A[i, i] += 2 * (ha + hs)
            A[i, (i + 1) % n] += hs
            b[i] = 6 * ((P[(i + 1) % n] - P[i]) / hs - (P[i] - P[i - 1]) / ha)
    else:
        A[0, 0] = A[-1, -1] = 1  # en los extremos r'' = 0
        for i in range(1, n - 1):
            A[i, i - 1] = h[i - 1]
            A[i, i] = 2 * (h[i - 1] + h[i])
            A[i, i + 1] = h[i]
            b[i] = 6 * ((P[i + 1] - P[i]) / h[i] - (P[i] - P[i - 1]) / h[i - 1])
    M = np.linalg.solve(A, b)
    if closed:
        M = np.vstack([M, M[:1]])

    t = np.linspace(0, nudos[-1], samples)
    k = np.clip(np.searchsorted(nudos, t, side="right") - 1, 0, len(h) - 1)
    hk = h[k][:, None]
    u = ((nudos[k + 1] - t) / h[k])[:, None]
    w = 1 - u

    r = u * Y[k] + w * Y[k + 1] + ((u**3 - u) * M[k] + (w**3 - w) * M[k + 1]) * hk**2 / 6
    r1 = (Y[k + 1] - Y[k]) / hk - (3 * u**2 - 1) / 6 * hk * M[k] + (3 * w**2 - 1) / 6 * hk * M[k + 1]
    r2 = u * M[k] + w * M[k + 1]

    # Hasta aqui t es "metros" (distancia entre puntos). Lo pasamos a segundos:
    # t_seg = t / V. Por regla de la cadena: r' se multiplica por V y r'' por V^2.
    # La forma de la curva (y la curvatura) no cambia, solo la rapidez.
    return t / VELOCIDAD, r, r1 * VELOCIDAD, r2 * VELOCIDAD**2
