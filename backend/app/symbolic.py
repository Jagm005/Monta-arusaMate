"""Modo formula: el usuario escribe r(t) = x(t) i + y(t) j + z(t) k y SymPy deriva
de forma exacta r'(t), r''(t), |r'(t)|, T(t) y kappa(t). Sirve para comprobar los
ejercicios de la guia (por ejemplo 13 y 19-22).
"""
from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout

import numpy as np
import sympy as sp
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

t = sp.Symbol("t", real=True)

FUNCIONES = {
    "sin": sp.sin, "sen": sp.sin, "cos": sp.cos, "tan": sp.tan,
    "asin": sp.asin, "acos": sp.acos, "atan": sp.atan, "arctan": sp.atan,
    "sinh": sp.sinh, "senh": sp.sinh, "cosh": sp.cosh, "tanh": sp.tanh,
    "exp": sp.exp, "ln": sp.log, "log": sp.log, "sqrt": sp.sqrt, "abs": sp.Abs,
    "pi": sp.pi, "e": sp.E, "t": t,
}
_PERMITIDO = re.compile(r"^[0-9a-z+\-*/^()., ]*$")
_TRANSFORMS = standard_transformations + (implicit_multiplication_application, convert_xor)
_pool = ThreadPoolExecutor(max_workers=2)


def parse(texto: str, nombre: str) -> sp.Expr:
    texto = texto.strip().lower()
    if not texto or len(texto) > 200 or not _PERMITIDO.match(texto):
        raise ValueError(f"{nombre}(t): usa solo numeros, t, + - * / ^ ( ) y funciones como sin, cos, exp, sqrt.")
    for palabra in re.findall(r"[a-z]+", texto):
        if palabra not in FUNCIONES:
            raise ValueError(f"{nombre}(t): no conozco '{palabra}'. Permitidos: {', '.join(sorted(FUNCIONES))}.")
    try:
        expr = parse_expr(texto, local_dict=dict(FUNCIONES), transformations=_TRANSFORMS)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"{nombre}(t): no pude leer la expresion ({exc}).") from exc
    if expr.free_symbols - {t}:
        raise ValueError(f"{nombre}(t): la unica variable permitida es t.")
    return sp.sympify(expr)


def _simplificar(expr: sp.Expr, segundos: float = 2.5) -> sp.Expr:
    futuro = _pool.submit(sp.simplify, expr)
    try:
        return futuro.result(timeout=segundos)
    except FutureTimeout:
        return expr


def _evaluar(expr: sp.Expr, ts: np.ndarray) -> np.ndarray:
    f = sp.lambdify(t, expr, "numpy")
    with np.errstate(all="ignore"):
        valores = np.asarray(f(ts), dtype=complex)
    valores = np.broadcast_to(valores, ts.shape)
    if not np.all(np.isfinite(valores)) or np.any(np.abs(valores.imag) > 1e-9):
        raise ValueError("La funcion no esta definida en todo el intervalo de t (revisa el dominio).")
    return valores.real.astype(float)


def formula_curve(x: str, y: str, z: str, t0: float, t1: float, samples: int):
    if not t1 > t0:
        raise ValueError("El intervalo debe cumplir t0 < t1.")
    r = sp.Matrix([parse(x, "x"), parse(y, "y"), parse(z, "z")])
    d1 = r.diff(t)
    d2 = d1.diff(t)
    rapidez = sp.sqrt(d1.dot(d1))
    cruz = d1.cross(d2)
    kappa = sp.sqrt(cruz.dot(cruz)) / rapidez**3

    ts = np.linspace(t0, t1, samples)
    R = np.column_stack([_evaluar(c, ts) for c in r])
    D1 = np.column_stack([_evaluar(c, ts) for c in d1])
    D2 = np.column_stack([_evaluar(c, ts) for c in d2])

    rapidez_s = _simplificar(rapidez)
    kappa_s = _simplificar(kappa)
    T_s = sp.Matrix([_simplificar(c / rapidez_s, 1.0) for c in d1])
    vec = lambda m: r"\left\langle " + ",\\; ".join(sp.latex(c) for c in m) + r" \right\rangle"  # noqa: E731
    latex = {
        "r": vec(r),
        "d1": vec(d1),
        "d2": vec(d2),
        "speed": sp.latex(rapidez_s),
        "T": vec(T_s),
        "kappa": sp.latex(kappa_s),
    }
    return ts, R, D1, D2, latex
