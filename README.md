# Montaña rusa con funciones vectoriales

Proyecto de Matemáticas 3.

La pista de la montaña rusa es una función vectorial r(t). Mientras el carrito avanza, el programa muestra la velocidad, la aceleración, la rapidez, el vector tangente unitario T, la curvatura, la longitud de la curva, la recta tangente y la fuerza G que siente el pasajero. Se puede dibujar la pista con el mouse o escribir r(t) (vienen ejercicios del taller cargados).

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

## Publicarlo en Vercel

Todo va en **un solo proyecto de Vercel**:

- El frontend se compila y queda como página estática.
- El backend corre como función de Python en `/api`.
- Como están en el mismo dominio, no hay que cambiar ninguna URL del código.

Los archivos que lo hacen posible:

- `vercel.json`: cómo compilar el frontend (`frontend/dist`) y que todo lo que empiece con `/api/...` vaya a la función de Python.
- `api/index.py`: la función de Python. Solo importa la app de FastAPI de `backend/app/main.py`.
- `requirements.txt` (en la raíz): las librerías de la función (fastapi, numpy, sympy).

Pasos:

1. Subir el proyecto a un repositorio de GitHub (sin `node_modules` ni `dist`; el `.gitignore` ya los excluye).
2. En vercel.com: **Add New → Project → Import** el repositorio.
3. Dejar **Root Directory** en la raíz del repo y **Framework Preset** en "Other". El resto lo toma de `vercel.json`.
4. **Deploy**. Cada vez que se haga push a GitHub, Vercel vuelve a publicar.

También se puede hacer desde la terminal, en la raíz del proyecto:

```powershell
npx vercel
npx vercel --prod
```

Notas:

- La primera vez que alguien usa la página después de un rato, Python tarda unos segundos en "despertar" (cargar NumPy y SymPy). Después responde rápido.
- Las librerías pesan unos 135 MB, por debajo del límite de 250 MB de las funciones de Vercel.

## Pruebas

En `backend`:

```powershell
C:\venvs\montana\Scripts\python -m pytest -q
```

Comparan el programa con ejercicios que hicimos a mano:

- Ejercicio 20: κ = 5/29.
- Ejercicio 13: la hélice siempre baja y su rapidez es √10.
- Ejercicio 12: rapidez 30 y κ = 1/5. También la fuerza G: √(180² + 9.8²) / 9.8 ≈ 18.4 G.
- Una recta a velocidad constante da 1 G (solo el peso).
- Las pistas dibujadas van a 15 m/s y la G de una curva horizontal coincide con v²/R.
