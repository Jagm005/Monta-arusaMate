# Montaña Rusa Vectorial

Una montaña rusa en 3D para Cálculo III. Dibujas la pista (o la escribes como $\mathbf r(t)$) y la app muestra en vivo $\mathbf T$, $\mathbf N$, $\mathbf B$, la curvatura $\kappa$, el círculo osculador, la aceleración tangencial y normal, las fuerzas G, la longitud de arco y la recta tangente.

- **Backend (Python):** FastAPI + NumPy + SymPy. Toda la matemática está aquí.
- **Frontend (TypeScript):** Vite + Three.js. Solo dibuja.
- **Manual:** [frontend/src/manual.md](frontend/src/manual.md). También se abre dentro de la app con el botón "📘 Manual".

## Cómo correrla

Necesitas Python 3.10+ y Node 18+.

**1. Backend** (una terminal, desde la carpeta `backend`):

```powershell
python -m venv C:\venvs\montana
C:\venvs\montana\Scripts\python -m pip install -r requirements.txt
C:\venvs\montana\Scripts\python -m uvicorn app.main:app --port 8000
```

> En Windows, crea el venv en una ruta corta (como `C:\venvs\...`): si la carpeta del proyecto tiene una ruta muy larga, pip falla al instalar.

**2. Frontend** (otra terminal, desde la carpeta `frontend`):

```powershell
npm install
npm run dev
```

Abre http://localhost:5173

**Versión de una sola terminal (para presentar):** ejecuta `npm run build` en `frontend` y luego solo el backend. FastAPI sirve la app compilada en http://localhost:8000

## Tests de la matemática

```powershell
cd backend
C:\venvs\montana\Scripts\python -m pytest -q
```

Comprueban que $\kappa = 5/29$ en el ejercicio 20, que $\kappa = 1/R$ en un círculo, que $\mathbf T$, $\mathbf N$, $\mathbf B$ son ortonormales, que la energía se conserva sin fricción y que se revisa el dominio.

## Estructura

```
backend/app/spline.py     puntos dibujados -> r(t), r'(t), r''(t)  (spline cubico C2)
backend/app/geometry.py   T, N, B, curvatura, longitud de arco
backend/app/physics.py    energia, a_T, a_N, fuerza G
backend/app/symbolic.py   modo formula: derivadas exactas con SymPy
backend/app/main.py       API /api/track y /api/formula
frontend/src/main.ts      interfaz y animacion
frontend/src/track.ts     rieles, durmientes, soportes, color por G o kappa
frontend/src/ride.ts      carrito, vectores T N B a, circulo osculador
frontend/src/editor.ts    dibujar y mover puntos de control
frontend/src/hud.ts       panel de valores, rectas/planos y grafica
frontend/src/manual.md    manual: que tema se usa, donde y por que
```
