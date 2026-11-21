"""Modo formula: escribimos r(t) y SymPy saca las derivadas exactas.
Sirve para revisar los ejercicios del taller (ej. 17 al 22 de curvatura).
"""
import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError

import numpy as np
import sympy as sp
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

t = sp.Symbol("t", real=True)

PERMITIDAS = {
    "sin": sp.sin, "sen": sp.sin, "cos": sp.cos, "tan": sp.tan,
    "sinh": sp.sinh, "senh": sp.sinh, "cosh": sp.cosh, "atan": sp.atan, "arctan": sp.atan,
    "exp": sp.exp, "ln": sp.log, "log": sp.log, "sqrt": sp.sqrt,
    "pi": sp.pi, "e": sp.E, "t": t,
}
TRANSFORMACIONES = standard_transformations + (implicit_multiplication_application, convert_xor)
hilos = ThreadPoolExecutor(max_workers=2)


def leer(texto, nombre):
    texto = texto.strip().lower()
    # solo dejamos numeros, operaciones y las funciones de la lista (por seguridad)
    if not texto or not re.fullmatch(r"[0-9a-z+\-*/^()., ]+", texto):
        raise ValueError(f"{nombre}(t) tiene caracteres no permitidos.")
    for palabra in re.findall(r"[a-z]+", texto):
        if palabra not in PERMITIDAS:
            raise ValueError(f"{nombre}(t): no se que es '{palabra}'.")
    try:
        return sp.sympify(parse_expr(texto, local_dict=dict(PERMITIDAS), transformations=TRANSFORMACIONES))
    except Exception:
        raise ValueError(f"No pude leer {nombre}(t), revisa los parentesis.")


def simplificar(expr):
    # a veces simplify se demora mucho, entonces le damos maximo 2.5 segundos
    try:
        return hilos.submit(sp.simplify, expr).result(timeout=2.5)
    except TimeoutError:
        return expr


def evaluar(expr, ts):
    f = sp.lambdify(t, expr, "numpy")
    with np.errstate(all="ignore"):
        valores = np.broadcast_to(np.asarray(f(ts), dtype=complex), ts.shape)
    if not np.all(np.isfinite(valores)) or np.any(abs(valores.imag) > 1e-9):
        raise ValueError("La funcion no esta definida en todo el intervalo (revisa el dominio).")
    return valores.real.astype(float)


def formula_curve(x, y, z, t0, t1, samples):
    if t1 <= t0:
        raise ValueError("Tiene que ser t0 < t1.")
    r = sp.Matrix([leer(x, "x"), leer(y, "y"), leer(z, "z")])
    r1 = r.diff(t)   # velocidad
    r2 = r1.diff(t)  # aceleracion
    rapidez = simplificar(sp.sqrt(r1.dot(r1)))
    cruz = r1.cross(r2)
    kappa = simplificar(sp.sqrt(cruz.dot(cruz)) / rapidez**3)

    ts = np.linspace(t0, t1, samples)
    R = np.column_stack([evaluar(c, ts) for c in r])
    R1 = np.column_stack([evaluar(c, ts) for c in r1])
    R2 = np.column_stack([evaluar(c, ts) for c in r2])

    vec = lambda m: r"\left\langle " + ",\\; ".join(sp.latex(c) for c in m) + r" \right\rangle"
    latex = {
        "r": vec(r),
        "d1": vec(r1),
        "d2": vec(r2),
        "speed": sp.latex(rapidez),
        "kappa": sp.latex(kappa),
    }
    return ts, R, R1, R2, latex
