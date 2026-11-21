"""Comprueba la matematica contra resultados conocidos de la guia."""
import math

import numpy as np
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_ejercicio_20_curvatura_constante():
    # r(t) = 5 cos t i + 2t j + 5 sen t k  ->  kappa = 5/29 en todo t
    r = client.post("/api/formula", json={"x": "5cos(t)", "y": "2t", "z": "5sin(t)", "t0": 0, "t1": 12.566, "v0": 15})
    assert r.status_code == 200, r.text
    d = r.json()
    assert np.allclose(d["kappa"], 5 / 29, atol=1e-4)
    # longitud = |r'| * (t1 - t0) = sqrt(29) * 4pi
    assert math.isclose(d["summary"]["length"], math.sqrt(29) * 12.566, rel_tol=1e-3)
    assert "29" in d["latex"]["kappa"]


def test_ejercicio_13_helice_siempre_baja():
    d = client.post("/api/formula", json={"x": "cos t", "y": "sin t", "z": "-3t+2", "t0": 0, "t1": 6}).json()
    assert all(v[2] < 0 for v in d["d1"])  # z'(t) = -3 < 0: siempre baja
    assert np.allclose(d["kappa"], 1 / 10, atol=1e-4)


def test_circulo_dibujado_curvatura_1_sobre_R():
    R = 20.0
    pts = [[R * math.cos(a), R * math.sin(a), 10.0] for a in np.linspace(0, 2 * math.pi, 24, endpoint=False)]
    d = client.post("/api/track", json={"points": pts, "closed": True}).json()
    assert np.allclose(d["kappa"], 1 / R, rtol=0.01)


def test_triedro_ortonormal():
    pts = [[0, 0, 20], [30, 5, 5], [40, 30, 15], [10, 40, 3], [-10, 20, 12]]
    d = client.post("/api/track", json={"points": pts, "closed": True}).json()
    T, N, B = (np.array(d[k]) for k in ("T", "N", "B"))
    assert np.allclose(np.sum(T * N, axis=1), 0, atol=1e-3)
    assert np.allclose(np.linalg.norm(np.cross(T, N) - B, axis=1), 0, atol=1e-3)


def test_energia_se_conserva_sin_friccion():
    pts = [[0, 0, 25], [30, 0, 2], [50, 20, 12], [20, 40, 4], [-10, 20, 10]]
    d = client.post("/api/track", json={"points": pts, "closed": True, "v0": 3, "mu": 0}).json()
    v, z = np.array(d["v"]), np.array(d["pos"])[:, 2]
    energia = 0.5 * v**2 + 9.81 * z
    assert np.allclose(energia, energia[0], atol=1e-2)
    assert d["summary"]["stallIndex"] is None


def test_open_track_se_detiene_si_no_alcanza():
    pts = [[0, 0, 2], [20, 0, 2], [40, 0, 30], [60, 0, 2]]
    d = client.post("/api/track", json={"points": pts, "closed": False, "v0": 2}).json()
    assert d["summary"]["stallIndex"] is not None


def test_dominio_invalido():
    r = client.post("/api/formula", json={"x": "sqrt(t-4)", "y": "t", "z": "0", "t0": 0, "t1": 2})
    assert r.status_code == 400
    assert "dominio" in r.json()["detail"]


def test_entrada_peligrosa_rechazada():
    r = client.post("/api/formula", json={"x": "__import__('os')", "y": "t", "z": "0"})
    assert r.status_code == 400
