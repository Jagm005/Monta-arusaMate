# Manual: la matemática detrás de la Montaña Rusa Vectorial

Esta app es una montaña rusa en 3D donde **cada cosa que ves es un tema del curso**. La pista es una función vectorial, el carrito se orienta con el triedro de Frenet, la seguridad se mide con la curvatura y las rectas tangentes salen en vivo. Toda la matemática se calcula en **Python** (NumPy + SymPy) y el navegador (**TypeScript + Three.js**) solo la dibuja.

## 1. Mapa rápido: tema → dónde aparece → por qué

| Tema del curso | Dónde lo ves en la app | Por qué se usa |
|---|---|---|
| Función vectorial $\mathbf r(t)$ | La pista misma | Una curva en el espacio **es** una función $t \mapsto (x(t), y(t), z(t))$ |
| Dominio y continuidad | Mensajes de error en modo fórmula; spline $C^2$ | La pista no puede tener huecos ni esquinas |
| Derivadas $\mathbf r'(t)$, $\mathbf r''(t)$ | Panel derecho, "Función vectorial" | De ellas sale todo lo demás: dirección, curvatura, planos |
| Velocidad, aceleración, rapidez | Panel derecho y velocímetro | Describen el movimiento sobre la curva |
| Longitud de arco $s$ | Eje horizontal de la gráfica, "metros de riel" | Medir la pista y mover el carrito a velocidad física real |
| Vector tangente $\mathbf T$ | Flecha **verde** | Hacia dónde apunta el carrito y la cámara de pasajero |
| Vector normal $\mathbf N$ | Flecha **roja** | Hacia dónde dobla la curva (hacia el centro) |
| Vector binormal $\mathbf B$ | Flecha **azul** | Perpendicular al plano donde está doblando la curva |
| Curvatura $\kappa$ y radio $\rho = 1/\kappa$ | Color de la pista, círculo **rosa** | Qué tan cerrada es la curva → qué tan fuerte es la fuerza |
| Componentes $a_T$, $a_N$ | Flecha **naranja** y panel | Separan "acelerar/frenar" de "doblar" |
| Rectas en el espacio | Recta tangente paramétrica y simétrica | Aproximación lineal de la pista en un punto |
| Producto punto y cruz, planos | $\kappa$, $\mathbf B$, plano normal y osculador | $\mathbf r' \times \mathbf r''$ es el corazón de la curvatura |

## 2. La pista es una función vectorial

Cuando **dibujas** puntos $P_1, P_2, \dots, P_n$, Python construye una función

$$\mathbf r(t) = x(t)\,\mathbf i + y(t)\,\mathbf j + z(t)\,\mathbf k$$

donde cada componente es un **spline cúbico**: entre dos puntos seguidos es un polinomio de grado 3 en $t$. El parámetro $t$ se mide en "longitud de cuerda": la suma de las distancias en línea recta entre puntos de control.

**¿Por qué cúbico y no rectas entre los puntos?** Con segmentos rectos la pista tendría esquinas. En una esquina $\mathbf r'(t)$ no existe, $\mathbf T$ salta de golpe y la curvatura sería infinita: el carrito sufriría un golpe brutal. El spline cúbico se construye para que $\mathbf r$, $\mathbf r'$ y $\mathbf r''$ sean **continuas** (clase $C^2$). Como $\kappa$ depende de $\mathbf r''$, la curvatura también cambia suavemente. Las montañas rusas reales se diseñan con esta misma idea.

En **modo fórmula** escribes tú $x(t)$, $y(t)$, $z(t)$. SymPy revisa el **dominio**: si escribes $\sqrt{t-4}$ con $t \in [0, 2]$, la app responde que la función no está definida en todo el intervalo, igual que en el problema 2 de funciones vectoriales.

## 3. Derivadas: velocidad, aceleración y rapidez

Con $t$ como "tiempo", el curso define (problemas 3, 4 y 5):

$$\mathbf v(t) = \mathbf r'(t), \qquad \mathbf a(t) = \mathbf r''(t), \qquad \text{rapidez} = |\mathbf r'(t)|$$

El panel derecho muestra estos tres valores en el punto donde está el carrito. En modo fórmula, SymPy los deriva **de forma exacta**, y puedes compararlos con tu solución a mano.

**Detalle importante:** el carrito real **no** se mueve con la rapidez $|\mathbf r'(t)|$ del parámetro, porque eso depende de cómo escribiste la curva. Se mueve según la física (sección 8). Por eso la app distingue:

- $\mathbf r'(t)$, $\mathbf r''(t)$: derivadas **del parámetro**, lo que se pide en la guía.
- $v$, $a_T$, $a_N$: movimiento **físico** del carrito, que depende de la gravedad.

La curvatura y $\mathbf T$, $\mathbf N$, $\mathbf B$ **no dependen** del parámetro. Son propiedades de la forma de la pista, así que coinciden en los dos mundos.

## 4. Longitud de arco

$$s(t) = \int_{t_0}^{t} |\mathbf r'(u)|\,du$$

Python calcula esta integral numéricamente (regla del trapecio con cientos de muestras). Se usa para tres cosas:

1. **Cuántos metros de riel** tiene la pista (resumen de abajo, "Longitud").
2. **El eje horizontal de la gráfica**: la altura, $\kappa$ y $G$ se grafican contra $s$, los metros recorridos.
3. **La física**: la energía se calcula en función de $s$, y el tiempo del recorrido es $\int ds / v$.

Para practicar los problemas 6 al 11, escribe la curva en modo fórmula con el intervalo pedido y lee "Longitud". Por ejemplo, el problema 20 en $[0, 4\pi]$ da $\sqrt{29}\cdot 4\pi \approx 67.67$.

## 5. El triedro de Frenet: T, N, B

$$\mathbf T = \frac{\mathbf r'}{|\mathbf r'|}, \qquad \mathbf B = \frac{\mathbf r' \times \mathbf r''}{|\mathbf r' \times \mathbf r''|}, \qquad \mathbf N = \mathbf B \times \mathbf T$$

- **T (verde):** la dirección de avance. La cámara "pasajero" mira en la dirección de $\mathbf T$.
- **N (rojo):** apunta hacia el **centro** de la curva, el lado hacia donde dobla la pista.
- **B (azul):** es perpendicular a $\mathbf T$ y $\mathbf N$. Se obtiene con el **producto cruz**.

Los tres son unitarios y mutuamente perpendiculares: $\mathbf T\cdot\mathbf N = \mathbf T \cdot \mathbf B = \mathbf N \cdot \mathbf B = 0$. Esto conecta con los ejercicios 11 a 13 de producto punto ("demuestre que son mutuamente ortogonales"). Los tests de Python comprueban que esto se cumpla en cada punto.

En un tramo recto $\kappa = 0$ y $\mathbf N$ no está definido. La app toma el $\mathbf N$ del tramo vecino y oculta la flecha roja. Observa también que en un **punto de inflexión**, donde la curva cambia de doblar a la izquierda a doblar a la derecha, $\mathbf N$ salta de lado. Por eso la app no orienta el carrito con $\mathbf N$, sino con un "marco de mínima rotación" que gira lo menos posible.

## 6. Curvatura: la medida de seguridad

$$\kappa = \frac{|\mathbf r'(t) \times \mathbf r''(t)|}{|\mathbf r'(t)|^3}, \qquad \rho = \frac{1}{\kappa}$$

$\kappa$ mide **qué tan rápido gira** $\mathbf T$ por cada metro recorrido. Una recta tiene $\kappa = 0$ y un círculo de radio $R$ tiene $\kappa = 1/R$ (los tests lo comprueban dibujando un círculo de 20 m).

**¿Por qué importa en una montaña rusa?** La aceleración hacia el centro de la curva es

$$a_N = \kappa\, v^2$$

así que una curva **el doble de cerrada** produce **el doble de fuerza**, y entrar **el doble de rápido** produce **cuatro veces** más fuerza. Por eso:

- La pista se **colorea** según $G$ (o según $\kappa$, si lo eliges): verde suave, amarillo intenso, rojo peligroso.
- El **círculo osculador** (rosa) es el círculo que mejor "abraza" la curva en ese punto. Su centro es $\mathbf r + \rho\,\mathbf N$ y su radio es $\rho$. Un círculo pequeño indica una curva cerrada, y por tanto peligrosa.

Para comprobarlo a mano con el problema 20, $\mathbf r = 5\cos t\,\mathbf i + 2t\,\mathbf j + 5\,\text{sen}\,t\,\mathbf k$:

$$\mathbf r' = \langle -5\,\text{sen}\,t,\ 2,\ 5\cos t\rangle,\quad \mathbf r'' = \langle -5\cos t,\ 0,\ -5\,\text{sen}\,t\rangle$$

$$\mathbf r'\times\mathbf r'' = \langle -10\,\text{sen}\,t,\ -25,\ 10\cos t\rangle,\quad |\mathbf r'\times\mathbf r''| = 5\sqrt{29},\quad |\mathbf r'| = \sqrt{29}$$

$$\kappa = \frac{5\sqrt{29}}{(\sqrt{29})^3} = \frac{5}{29} \approx 0.1724$$

Carga el preset "Ej. 20", usa **Ir a t = π** y compara: el panel muestra $\kappa = 0.1724$.

## 7. Componentes tangencial y normal de la aceleración

Toda aceleración sobre una curva se separa en dos partes:

$$\mathbf a = a_T\,\mathbf T + a_N\,\mathbf N, \qquad a_T = \frac{dv}{dt}, \qquad a_N = \kappa v^2$$

- $a_T$ **acelera o frena** al carrito, a lo largo de la pista.
- $a_N$ **lo hace doblar**, hacia el centro de la curva.

La flecha **naranja** es $\mathbf a$. En una bajada recta es casi paralela a $\mathbf T$; en una curva cerrada a velocidad constante apunta casi igual que $\mathbf N$.

Con el **producto punto** se ve si el carrito acelera ($\mathbf v \cdot \mathbf a > 0$) o frena ($\mathbf v \cdot \mathbf a < 0$), porque $\mathbf v\cdot\mathbf a = v\,a_T$.

## 8. Física real: energía y fuerzas G

El carrito no tiene motor: lo mueve la gravedad. Por conservación de la energía, con una fricción simplificada $\mu$:

$$v(s)^2 = v_0^2 + 2g\,(z_0 - z(s)) - 2\mu g\,s$$

- En pistas cerradas, el carrito **arranca en el punto más alto**, donde termina la cadena de subida.
- Si en algún punto $v^2 \le 0$, el carrito **no alcanza a subir**: la app lo detiene, sombrea esa parte de la gráfica y te avisa. Prueba a subir la fricción o a hacer una colina más alta que el punto de inicio.

Derivando la energía respecto al tiempo se obtiene $a_T = -g\,T_z - \mu g$: en bajada $T_z < 0$ y el carrito acelera.

La **fuerza G** es lo que siente el pasajero: su aceleración menos la gravedad, comparada con $g$:

$$G = \frac{|\mathbf a - \mathbf g|}{g}, \qquad \mathbf g = \langle 0, 0, -9.81\rangle$$

Quieto en el suelo sientes $1G$. En el fondo de un valle cerrado puedes sentir $3G$ o $4G$. Las montañas rusas reales casi nunca pasan de $5G$; por eso el medidor se pone rojo ahí.

## 9. Rectas y planos en el punto del carrito

El panel "Rectas y planos" usa la sección de rectas en el espacio (problemas 1 a 8) y la de planos (producto cruz, problemas 11 a 21).

**Recta tangente**, que pasa por $\mathbf r(t_0)$ con dirección $\mathbf r'(t_0) = \langle a, b, c\rangle$:

$$x = x_0 + a\,u, \quad y = y_0 + b\,u, \quad z = z_0 + c\,u$$

$$\frac{x - x_0}{a} = \frac{y - y_0}{b} = \frac{z - z_0}{c}$$

Si alguna componente es 0 no se puede dividir entre ella, y esa coordenada queda fija (por ejemplo $x = x_0$), igual que en clase.

**Plano normal**: el plano perpendicular a la pista, con vector normal $\mathbf r'$:

$$a(x - x_0) + b(y - y_0) + c(z - z_0) = 0$$

**Plano osculador**: el plano donde "vive" la curva en ese instante, el que contiene a $\mathbf T$ y a $\mathbf N$, con vector normal $\mathbf B$. El círculo osculador está dibujado en este plano.

## 10. Ejercicios de la guía que puedes resolver con la app

| Ejercicio | Qué hacer |
|---|---|
| Func. vectoriales 3–5 | Modo fórmula: SymPy muestra $\mathbf r'$, $\mathbf r''$, $|\mathbf r'|$ exactos |
| Func. vectoriales 6–11 | Modo fórmula con el intervalo dado → "Longitud" |
| Func. vectoriales 13 (hélice) | Preset "Ej. 13": $z' = -3 < 0$, así que **siempre baja** y nunca se detiene; nunca llega a 12 m porque empieza en $z = 2$ |
| Curvatura 17–22 | Preset → "Ir a t = π" → leer $\mathbf v$, $\mathbf a$, $\mathbf T$, $\kappa$ |
| Curvatura 24–31 | Escribe la curva plana con $z = 0$ y usa "Ir a t" |
| Rectas 1–8 | La recta tangente del panel es una recta paramétrica y simétrica |

## 11. Cómo usar la app

**Dibujar la pista**
- **Clic en el suelo**: agrega un punto de control a la altura elegida con el deslizador. Si hay un punto seleccionado, el nuevo se inserta **después** de él.
- **Clic en un punto**: lo selecciona (amarillo). Arrastra las flechas: roja = $x$, verde = $y$, azul = $z$ (altura).
- **Supr**: borra el punto seleccionado. **Esc**: lo deselecciona.
- El punto verde es $P_1$. "Pista cerrada" une el último punto con el primero.

**Ver y analizar**
- Play/pausa con el botón o la **barra espaciadora**. Arrastra sobre la gráfica para mover el carrito a mano.
- Cámaras: órbita libre, seguir al carrito o **pasajero** (primera persona).
- Activa o desactiva $\mathbf T$, $\mathbf N$, $\mathbf B$, $\mathbf a$ y el círculo osculador.

**Arquitectura**
- `backend/app/spline.py`: puntos → $\mathbf r(t)$, $\mathbf r'(t)$, $\mathbf r''(t)$.
- `backend/app/geometry.py`: $\mathbf T$, $\mathbf N$, $\mathbf B$, $\kappa$, $s$.
- `backend/app/physics.py`: energía, $a_T$, $a_N$, $G$.
- `backend/app/symbolic.py`: derivadas exactas con SymPy.
- `frontend/src`: Three.js dibuja; no calcula nada de cálculo vectorial.
