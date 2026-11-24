"""Entrada para Vercel.

Vercel convierte cada archivo de la carpeta api/ en una funcion. Esta funcion
solo importa la app de FastAPI que esta en backend/app/main.py, asi el codigo
del backend no cambia: las rutas /api/track y /api/formula son las mismas.
"""
import sys
from pathlib import Path

# para que Python encuentre el paquete "app" dentro de backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402,F401  (Vercel busca una variable llamada "app")
