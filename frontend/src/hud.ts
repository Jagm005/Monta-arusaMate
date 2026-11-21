import katex from "katex";
import { indexOf } from "./frames";
import type { RideState, TrackData, Vec3 } from "./types";

export const tex = (s: string) => katex.renderToString(s, { throwOnError: false });

function num(x: number, d = 2): string {
  const v = Math.abs(x) < 0.5 * 10 ** -d ? 0 : x;
  return v.toFixed(d);
}
const vec = (v: Vec3, d = 2) => `\\langle ${num(v[0], d)},\\ ${num(v[1], d)},\\ ${num(v[2], d)}\\rangle`;
const mas = (x: number) => (x < 0 ? `- ${num(-x)}` : `+ ${num(x)}`);

// Clasificamos la curva por su radio (1/kappa)
function tipoDeCurva(k: number) {
  const radio = k > 1e-6 ? 1 / k : Infinity;
  if (radio > 25) return { nombre: "Casi recta", clase: "ok" };
  if (radio > 10) return { nombre: "Curva normal", clase: "warn" };
  return { nombre: "Curva cerrada", clase: "bad" };
}

/** Panel de la derecha con los valores en el punto del carrito. */
export class Hud {
  private ultimo = 0;

  constructor(private root: HTMLElement) {}

  update(st: RideState, forzar = false) {
    if (!forzar && performance.now() - this.ultimo < 120) return;
    this.ultimo = performance.now();

    const tipo = tipoDeCurva(st.kappa);
    const radio = st.kappa > 1e-6 ? 1 / st.kappa : Infinity;
    const [x0, y0, z0] = st.pos;
    const [a, b, c] = st.d1;
    const sim = [
      Math.abs(a) > 1e-3 ? `\\dfrac{x ${mas(-x0)}}{${num(a)}}` : null,
      Math.abs(b) > 1e-3 ? `\\dfrac{y ${mas(-y0)}}{${num(b)}}` : null,
      Math.abs(c) > 1e-3 ? `\\dfrac{z ${mas(-z0)}}{${num(c)}}` : null,
    ].filter(Boolean);
    const fijas = [
      Math.abs(a) <= 1e-3 ? `x = ${num(x0)}` : null,
      Math.abs(b) <= 1e-3 ? `y = ${num(y0)}` : null,
      Math.abs(c) <= 1e-3 ? `z = ${num(z0)}` : null,
    ].filter(Boolean);
    const pct = Math.min(st.kappa / 0.1, 1) * 100; // la barra se llena con radio 10

    this.root.innerHTML = `
      <div class="medidor ${tipo.clase}">
        <div class="medidor-top">
          <span class="medidor-valor">κ = ${num(st.kappa, 4)}</span>
          <span class="medidor-tipo">${tipo.nombre}</span>
        </div>
        <div class="barra"><div class="barra-tapa" style="left:${pct}%"></div></div>
        <div class="muted">radio de la curva: ${isFinite(radio) ? num(radio, 1) + " m" : "∞ (recta)"}</div>
      </div>

      <section>
        <h3>Posición, velocidad y aceleración <span class="muted">t = ${num(st.t, 3)}</span></h3>
        <div class="row">${tex(`\\mathbf r(t) = ${vec(st.pos)}`)}</div>
        <div class="row"><span class="dot v"></span>${tex(`\\mathbf v = \\mathbf r'(t) = ${vec(st.d1)}`)}</div>
        <div class="row"><span class="dot a"></span>${tex(`\\mathbf a = \\mathbf r''(t) = ${vec(st.d2)}`)}</div>
        <div class="row">${tex(`\\text{rapidez} = |\\mathbf r'(t)| = ${num(st.speed, 3)}`)}</div>
      </section>

      <section>
        <h3>Vector tangente unitario</h3>
        <div class="row"><span class="dot t"></span>${tex(`\\mathbf T = \\dfrac{\\mathbf r'(t)}{|\\mathbf r'(t)|} = ${vec(st.T, 3)}`)}</div>
      </section>

      <section>
        <h3>Curvatura</h3>
        <div class="row">${tex(`\\kappa = \\dfrac{|\\mathbf r'(t)\\times \\mathbf r''(t)|}{|\\mathbf r'(t)|^3} = ${num(st.kappa, 4)}`)}</div>
      </section>

      <section>
        <h3>Ángulo entre v y a (producto punto)</h3>
        <div class="row">${tex(
          st.angle === null
            ? `\\mathbf a = \\mathbf 0 \\Rightarrow \\text{no hay ángulo}`
            : `\\cos\\theta = \\dfrac{\\mathbf v\\cdot\\mathbf a}{|\\mathbf v||\\mathbf a|} \\Rightarrow \\theta = ${num(st.angle, 1)}^\\circ`,
        )}</div>
        <p class="muted small">${
          st.angle === null ? "" : st.angle < 89.5 ? "θ < 90°: el carrito va acelerando" : st.angle > 90.5 ? "θ > 90°: el carrito va frenando" : "θ = 90°: v y a son ortogonales (la rapidez no cambia)"
        }</p>
      </section>

      <section>
        <h3>Recta tangente en este punto</h3>
        <p class="muted small">Paramétricas (punto r(t), dirección r'(t)):</p>
        <div class="row">${tex(`x = ${num(x0)} ${mas(a)}u,\\quad y = ${num(y0)} ${mas(b)}u,\\quad z = ${num(z0)} ${mas(c)}u`)}</div>
        <p class="muted small">Simétricas:</p>
        <div class="row">${tex(sim.join(" = ") + (fijas.length ? (sim.length ? ",\\ " : "") + fijas.join(",\\ ") : ""))}</div>
      </section>
    `;
  }
}

/** Grafica de abajo: altura, curvatura y rapidez contra t. */
export class Chart {
  private data: TrackData | null = null;
  onSeek: (t: number) => void = () => {};

  constructor(private canvas: HTMLCanvasElement) {
    const mover = (e: PointerEvent) => {
      if (!this.data) return;
      const r = canvas.getBoundingClientRect();
      const f = Math.min(Math.max((e.clientX - r.left - 8) / (r.width - 16), 0), 1);
      const { t0, t1 } = this.data.summary;
      this.onSeek(t0 + f * (t1 - t0));
    };
    canvas.addEventListener("pointerdown", (e) => {
      mover(e);
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => e.buttons & 1 && mover(e));
  }

  setData(d: TrackData | null) {
    this.data = d;
  }

  draw(tActual: number) {
    const c = this.canvas;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const W = c.clientWidth;
    const H = c.clientHeight;
    if (c.width !== W * dpr || c.height !== H * dpr) {
      c.width = W * dpr;
      c.height = H * dpr;
    }
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const d = this.data;
    if (!d) return;

    const { t0, t1 } = d.summary;
    const X = (t: number) => 8 + ((t - t0) / (t1 - t0)) * (W - 16);
    const Y = (f: number) => H - 10 - f * (H - 20);
    const zs = d.pos.map((p) => p[2]);
    const zmin = Math.min(...zs);
    const zrango = Math.max(...zs) - zmin || 1;

    ctx.beginPath();
    ctx.moveTo(X(t0), Y(0));
    d.t.forEach((t, i) => ctx.lineTo(X(t), Y((zs[i] - zmin) / zrango)));
    ctx.lineTo(X(t1), Y(0));
    ctx.fillStyle = "rgba(148,163,184,0.2)";
    ctx.fill();

    const linea = (vals: number[], color: string) => {
      const max = Math.max(...vals) || 1;
      const min = Math.min(...vals);
      const plano = max - min < 1e-6 * max; // si es constante la dibujamos a la mitad
      ctx.beginPath();
      vals.forEach((v, i) => {
        const y = Y(plano ? 0.5 : (v - min) / (max - min));
        if (i) ctx.lineTo(X(d.t[i]), y);
        else ctx.moveTo(X(d.t[i]), y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    };
    linea(d.kappa, "#e879f9");
    linea(d.speed, "#60a5fa");

    const xc = X(tActual);
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(xc, 0);
    ctx.lineTo(xc, H);
    ctx.stroke();
    const i = Math.round(indexOf(d.t, tActual));
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(xc, Y((zs[i] - zmin) / zrango), 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
