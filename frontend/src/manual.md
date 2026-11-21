# Manual del proyecto

## ¿Qué es?

Es una montaña rusa en 3D donde la pista es una **función vectorial** $\mathbf r(t)$. Mientras el carrito avanza, el programa calcula lo que vimos en el taller: velocidad, aceleración, rapidez, vector tangente unitario, curvatura, longitud de la curva y la recta tangente.

Los cálculos los hace **Python** (con NumPy y SymPy). La parte visual está hecha en **TypeScript** con Three.js.

## Temas del taller que usamos

| Tema del taller | Dónde se ve en el programa |
|---|---|
| Funciones vectoriales | La pista es $\mathbf r(t) = x(t)\,\mathbf i + y(t)\,\mathbf j + z(t)\,\mathbf k$ |
| Dominio | Si la fórmula no está definida en el intervalo, sale un aviso |
| Derivadas $\mathbf r'(t)$ y $\mathbf r''(t)$ | Panel derecho y flechas azul y naranja |
| Velocidad, aceleración y rapidez | $\mathbf v = \mathbf r'(t)$, $\mathbf a = \mathbf r''(t)$, rapidez $= |\mathbf r'(t)|$ |
| Longitud de la curva | Abajo, en "longitud" |
| Vector tangente unitario $\mathbf T$ | Flecha verde |
| Curvatura $\kappa$ | Color de la pista y valor arriba a la derecha |
| Producto cruz | Para calcular $\kappa$ |
| Producto punto | Ángulo entre $\mathbf v$ y $\mathbf a$ |
| Rectas paramétricas y simétricas | Recta tangente en el punto del carrito |

## 1. La pista es una función vectorial

Hay dos formas de hacer la pista:

- **Escribir r(t):** se ponen $x(t)$, $y(t)$, $z(t)$ y el intervalo de $t$. Ya vienen cargados varios ejercicios del taller.
- **Dibujarla:** se ponen puntos con el mouse y el programa los une con curvas suaves. Entre cada par de puntos usa un polinomio de grado 3 para $x(t)$, $y(t)$ y $z(t)$; así la curva se puede derivar y no tiene picos.

El carrito se mueve con el parámetro $t$, como si $t$ fuera el tiempo.

## 2. Velocidad, aceleración y rapidez

Igual que en el ejercicio 5 de funciones vectoriales:

$$\mathbf v(t) = \mathbf r'(t), \qquad \mathbf a(t) = \mathbf r''(t), \qquad \text{rapidez} = |\mathbf r'(t)|$$

- La flecha **azul** es $\mathbf v$ y la **naranja** es $\mathbf a$ (están dibujadas a la misma escala).
- En modo fórmula, SymPy saca las derivadas exactas y las muestra a la izquierda. Sirve para revisar los ejercicios 3 y 4 ($D_1\mathbf r = \mathbf r'$, $D_2\mathbf r = \mathbf r''$).

**Ejemplo, ejercicio 13 (hélice):** $\mathbf r(t) = \cos t\,\mathbf i + \text{sen}\,t\,\mathbf j + (-3t+2)\,\mathbf k$.

$$\mathbf r'(t) = \langle -\text{sen}\,t,\ \cos t,\ -3 \rangle, \qquad |\mathbf r'(t)| = \sqrt{\text{sen}^2 t + \cos^2 t + 9} = \sqrt{10}$$

- Como $z'(t) = -3 < 0$, la partícula **siempre baja**.
- Como $|\mathbf r'(t)| = \sqrt{10} \neq 0$, **nunca se detiene**.
- Como empieza en $z = 2$ y siempre baja, nunca llega a 12 metros de altura con $t \ge 0$.

En el programa se ve que la flecha azul siempre apunta hacia abajo y la rapidez no cambia.

## 3. Longitud de la curva

$$L = \int_{t_0}^{t_1} |\mathbf r'(t)|\,dt$$

Python la calcula sumando muchos pedacitos (regla del trapecio). Sirve para los ejercicios 6 al 11: escribes la curva y su intervalo y miras "longitud" abajo.

Ejemplo, ejercicio 20 en $[0, 4\pi]$: $|\mathbf r'(t)| = \sqrt{29}$ es constante, entonces $L = 4\pi\sqrt{29} \approx 67.67$.

## 4. Vector tangente unitario

$$\mathbf T(t) = \frac{\mathbf r'(t)}{|\mathbf r'(t)|}$$

Es la flecha **verde**. Apunta hacia donde va el carrito y siempre mide 1. También se usa para orientar el carrito sobre la pista.

## 5. Curvatura

$$\kappa = \frac{|\mathbf r'(t) \times \mathbf r''(t)|}{|\mathbf r'(t)|^3}$$

Aquí se usa el **producto cruz**. La curvatura dice qué tan cerrada es la curva: una recta tiene $\kappa = 0$, y una circunferencia de radio $R$ tiene $\kappa = 1/R$.

En el programa:

- La pista se pinta de **verde** donde $\kappa$ es pequeña (casi recta) y de **rojo** donde la curva es cerrada (radio $1/\kappa$ menor a 10, o sea $\kappa > 0.1$).
- Arriba a la derecha sale el valor de $\kappa$ y el radio $1/\kappa$.

**Ejemplo, ejercicio 20:** $\mathbf r(t) = 5\cos t\,\mathbf i + 2t\,\mathbf j + 5\,\text{sen}\,t\,\mathbf k$, con $t_1 = \pi$.

$$\mathbf r'(t) = \langle -5\,\text{sen}\,t,\ 2,\ 5\cos t\rangle \;\Rightarrow\; \mathbf v(\pi) = \langle 0,\ 2,\ -5\rangle$$

$$\mathbf r''(t) = \langle -5\cos t,\ 0,\ -5\,\text{sen}\,t\rangle \;\Rightarrow\; \mathbf a(\pi) = \langle 5,\ 0,\ 0\rangle$$

$$\mathbf T(\pi) = \frac{\langle 0, 2, -5\rangle}{\sqrt{29}}$$

$$\mathbf r' \times \mathbf r'' = \langle -10\,\text{sen}\,t,\ -25,\ 10\cos t\rangle, \qquad |\mathbf r' \times \mathbf r''| = \sqrt{100 + 625} = 5\sqrt{29}$$

$$\kappa = \frac{5\sqrt{29}}{(\sqrt{29})^3} = \frac{5}{29} \approx 0.1724$$

Para comprobarlo, se escoge "Curvatura 20", se escribe "Ir a t = pi" y el panel muestra lo mismo.

## 6. Ángulo entre v y a (producto punto)

Con la fórmula del ángulo entre dos vectores:

$$\cos\theta = \frac{\mathbf v \cdot \mathbf a}{|\mathbf v|\,|\mathbf a|}$$

- Si $\theta < 90°$, el carrito va acelerando.
- Si $\theta > 90°$, va frenando.
- Si $\theta = 90°$, $\mathbf v$ y $\mathbf a$ son **ortogonales** ($\mathbf v \cdot \mathbf a = 0$) y la rapidez no cambia. Esto pasa en las hélices de los ejercicios 13 y 20.

## 7. Recta tangente (rectas paramétricas y simétricas)

En cada punto se arma la recta que pasa por $\mathbf r(t) = (x_0, y_0, z_0)$ con dirección $\mathbf r'(t) = \langle a, b, c\rangle$, como en los ejercicios 5 al 8 de rectas:

$$x = x_0 + a\,u, \qquad y = y_0 + b\,u, \qquad z = z_0 + c\,u$$

$$\frac{x - x_0}{a} = \frac{y - y_0}{b} = \frac{z - z_0}{c}$$

Si alguna componente es 0, esa coordenada queda fija (por ejemplo $x = x_0$), porque no se puede dividir entre 0.

## Cómo se usa

- **Dibujar:** clic en el suelo para poner puntos. Clic en un punto para moverlo con las flechas (la azul es la altura). Supr lo borra.
- **Escribir r(t):** escoger un ejercicio o escribir uno propio, y luego "Calcular".
- **Ir a t =:** pone el carrito en ese valor de $t$ (acepta pi, pi/4, ln(2), etc.).
- **Barra espaciadora:** pausa. También se puede arrastrar sobre la gráfica de abajo para mover el carrito.

## Archivos

- `backend/app/spline.py`: une los puntos dibujados y da $\mathbf r$, $\mathbf r'$, $\mathbf r''$.
- `backend/app/geometry.py`: $\mathbf T$, $\kappa$, longitud y ángulo entre $\mathbf v$ y $\mathbf a$.
- `backend/app/symbolic.py`: derivadas exactas con SymPy.
- `frontend/src/`: la parte 3D.
