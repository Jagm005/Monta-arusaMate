# Montaña rusa con funciones vectoriales

Proyecto de Matemáticas 3.

La pista de la montaña rusa es una función vectorial r(t). Mientras el carrito avanza, el programa muestra la velocidad, la aceleración, la rapidez, el vector tangente unitario T, la curvatura, la longitud de la curva y la recta tangente. Se puede dibujar la pista con el mouse o escribir r(t) (vienen ejercicios del taller cargados).

- **Backend:** Python (FastAPI, NumPy, SymPy). Aquí están los cálculos.
- **Frontend:** TypeScript con Three.js para el 3D.
- **Manual:** [frontend/src/manual.md](frontend/src/manual.md). También se abre con el botón "Manual" dentro del programa.

## Cómo correrlo

Se necesita Python y Node.js.

**Backend** (terminal 1, en la carpeta `backend`):

```powershell
python -m venv C:\venvs\montana
C:\venvs\montana\Scripts\python -m pip install -r requirements.txt
C:\venvs\montana\Scripts\python -m uvicorn app.main:app --port 8000
```

(En Windows el venv toca crearlo en una ruta corta; si la carpeta tiene una ruta muy larga, pip falla.)

**Frontend** (terminal 2, en la carpeta `frontend`):

```powershell
npm install
npm run dev
```

Luego se abre http://localhost:5173

## Pruebas

En `backend`:

```powershell
C:\venvs\montana\Scripts\python -m pytest -q
```

Comparan el programa con ejercicios que hicimos a mano:

- Ejercicio 20: κ = 5/29.
- Ejercicio 13: la hélice siempre baja y su rapidez es √10.
- Ejercicio 12: rapidez 30 y κ = 1/5.
