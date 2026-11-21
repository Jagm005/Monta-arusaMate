"""Pruebas: comparamos con ejercicios del taller que ya resolvimos a mano."""
import math

import numpy as np
from fastapi.testclient import TestClient

from app.main import app

cliente = TestClient(app)


def formula(x, y, z, t0, t1):
    return cliente.post("/api/formula", json={"x": x, "y": y, "z": z, "t0": t0, "t1": t1})


def test_ejercicio_20_curvatura():
    # r(t) = 5cos t i + 2t j + 5sen t k  ->  a mano nos dio kappa = 5/29
    d = formula("5cos(t)", "2t", "5sin(t)", 0, 4 * math.pi).json()
    assert np.allclose(d["kappa"], 5 / 29, atol=1e-4)
    assert "29" in d["latex"]["kappa"]
    # longitud = sqrt(29) * 4pi
    assert math.isclose(d["summary"]["length"], math.sqrt(29) * 4 * math.pi, rel_tol=1e-3)


def test_ejercicio_13_helice_baja():
    # z'(t) = -3 < 0, entonces siempre va hacia abajo, y la rapidez es sqrt(10)
    d = formula("cos t", "sin t", "-3t + 2", 0, 6).json()
    assert all(v[2] < 0 for v in d["d1"])
    assert np.allclose(d["speed"], math.sqrt(10), atol=1e-4)


def test_ejercicio_12_circulo():
    # x^2 + y^2 = 25 con velocidad angular 6: |v| = 30, kappa = 1/5
    d = formula("5cos(6t)", "5sin(6t)", "0", 0, 2).json()
    assert np.allclose(d["speed"], 30, atol=1e-3)
    assert np.allclose(d["kappa"], 1 / 5, atol=1e-4)


def test_circulo_dibujado():
    R = 20
    puntos = [[R * math.cos(a), R * math.sin(a), 10] for a in np.linspace(0, 2 * math.pi, 24, endpoint=False)]
    d = cliente.post("/api/track", json={"points": puntos, "closed": True}).json()
    assert np.allclose(d["kappa"], 1 / R, rtol=0.01)


def test_T_es_unitario():
    d = cliente.post("/api/track", json={"points": [[0, 0, 5], [30, 5, 15], [40, 30, 8], [10, 40, 3]]}).json()
    assert np.allclose(np.linalg.norm(d["T"], axis=1), 1, atol=1e-4)


def test_dominio():
    r = formula("sqrt(t-4)", "t", "0", 0, 2)
    assert r.status_code == 400 and "dominio" in r.json()["detail"]


def test_texto_raro():
    assert formula("__import__('os')", "t", "0", 0, 1).status_code == 400
