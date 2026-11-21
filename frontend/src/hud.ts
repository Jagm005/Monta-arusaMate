import katex from "katex";
import { indexAtS } from "./frames";
import type { RideState, TrackData, Vec3 } from "./types";

export const tex = (s: string, display = false) => katex.renderToString(s, { throwOnError: false, displayMode: display });

export function fmt(x: number, d = 2): string {
  if (!isFinite(x)) return "\\infty";
  const v = Math.abs(x) < 0.5 * 10 ** -d ? 0 : x;
  return v.toFixed(d);
}
const vec = (v: Vec3, d = 2) => `\\langle ${fmt(v[0], d)},\\ ${fmt(v[1], d)},\\ ${fmt(v[2], d)}\\rangle`;
const signed = (x: number, d = 2) => (x < 0 ? `- ${fmt(-x, d)}` : `+ ${fmt(x, d)}`);

function gZone(g: number) {
  if (g < 3) return { name: "Suave", cls: "ok" };
  if (g < 5) return { name: "Intensa", cls: "warn" };
  return { name: "Peligrosa", cls: "bad" };
}

/** Panel derecho: todos los numeros del punto donde esta el carrito. */
export class Hud {
  private last = 0;

  constructor(private root: HTMLElement) {}

  update(st: RideState, force = false) {
    const now = performance.now();
    if (!force && now - this.last < 120) return;
    this.last = now;
    const zone = gZone(st.g);
    const pct = Math.min(st.g / 6, 1) * 100;
    const R = st.kappa > 1e-6 ? 1 / st.kappa : Infinity;
    const [x0, y0, z0] = st.pos;
    const [a, b, c] = st.d1;
    const sym = (val: number, p: number, name: string) =>
      Math.abs(val) < 1e-3 ? null : `\\dfrac{${name} ${signed(-p)}}{${fmt(val)}}`;
    const parts = [sym(a, x0, "x"), sym(b, y0, "y"), sym(c, z0, "z")].filter(Boolean);
    const fixed = [
      Math.abs(a) < 1e-3 ? `x = ${fmt(x0)}` : null,
      Math.abs(b) < 1e-3 ? `y = ${fmt(y0)}` : null,
      Math.abs(c) < 1e-3 ? `z = ${fmt(z0)}` : null,
    ].filter(Boolean);
    const plane = (n: Vec3) =>
      `${fmt(n[0])}(x ${signed(-x0)}) ${signed(n[1])}(y ${signed(-y0)}) ${signed(n[2])}(z ${signed(-z0)}) = 0`;

    this.root.innerHTML = `
      <div class="gmeter ${st.stalled ? "stalled" : zone.cls}">
        <div class="gmeter-top">
          <span class="gmeter-value">${st.stalled ? "—" : st.g.toFixed(2)}<small>G</small></span>
          <span class="gmeter-zone">${st.stalled ? "Detenido" : zone.name}</span>
        </div>
        <div class="gbar"><div class="gbar-fill" style="left:${st.stalled ? 0 : pct}%"></div>
          <i style="left:${(3 / 6) * 100}%"></i><i style="left:${(5 / 6) * 100}%"></i></div>
        <div class="gmeter-speed"><b>${(st.v * 3.6).toFixed(0)}</b> km/h · ${st.v.toFixed(1)} m/s · s = ${st.s.toFixed(1)} m</div>
      </div>

      <section>
        <h3>Funcion vectorial <span class="muted">en t = ${fmt(st.t, 3)}</span></h3>
        <div class="row">${tex(`\\mathbf r(t) = ${vec(st.pos)}`)}</div>
        <div class="row">${tex(`\\mathbf r'(t) = ${vec(st.d1)}`)}</div>
        <div class="row">${tex(`\\mathbf r''(t) = ${vec(st.d2)}`)}</div>
        <div class="row">${tex(`|\\mathbf r'(t)| = ${fmt(Math.hypot(...st.d1), 3)}`)}</div>
      </section>

      <section>
        <h3>Triedro de Frenet</h3>
        <div class="row"><span class="dot t"></span>${tex(`\\mathbf T = ${vec(st.T, 3)}`)}</div>
        <div class="row"><span class="dot n"></span>${tex(`\\mathbf N = ${vec(st.N, 3)}`)}</div>
        <div class="row"><span class="dot b"></span>${tex(`\\mathbf B = ${vec(st.B, 3)}`)}</div>
      </section>

      <section>
        <h3>Curvatura</h3>
        <div class="row"><span class="dot c"></span>${tex(`\\kappa = ${fmt(st.kappa, 4)}\\ \\text{m}^{-1} \\qquad \\rho = \\tfrac{1}{\\kappa} = ${isFinite(R) ? fmt(R, 2) + "\\ \\text{m}" : "\\infty"}`)}</div>
      </section>

      <section>
        <h3>Aceleracion del carrito</h3>
        <div class="row"><span class="dot a"></span>${tex(`\\mathbf a = a_T\\mathbf T + a_N\\mathbf N`)}</div>
        <div class="row">${tex(`a_T = ${fmt(st.aT)} \\qquad a_N = \\kappa v^2 = ${fmt(st.aN)}\\ \\tfrac{\\text{m}}{\\text{s}^2}`)}</div>
      </section>

      <section>
        <h3>Rectas y planos en este punto</h3>
        <p class="muted small">Recta tangente (parametrica):</p>
        <div class="row">${tex(`\\begin{cases} x = ${fmt(x0)} ${signed(a)}\\,u \\\\ y = ${fmt(y0)} ${signed(b)}\\,u \\\\ z = ${fmt(z0)} ${signed(c)}\\,u \\end{cases}`)}</div>
        <p class="muted small">Ecuaciones simetricas:</p>
        <div class="row">${tex(parts.join(" = ") + (fixed.length ? (parts.length ? ",\\ " : "") + fixed.join(",\\ ") : ""))}</div>
        <p class="muted small">Plano normal (normal = r'):</p>
        <div class="row">${tex(plane(st.d1))}</div>
        <p class="muted small">Plano osculador (normal = B):</p>
        <div class="row">${tex(plane(st.B))}</div>
      </section>
    `;
  }
}

/** Grafica inferior: perfil de altura z(s), curvatura kappa(s) y fuerza G(s). */
export class Chart {
  private data: TrackData | null = null;
  onSeek: (s: number) => void = () => {};

  constructor(private canvas: HTMLCanvasElement) {
    const seek = (e: PointerEvent) => {
      if (!this.data) return;
      const r = canvas.getBoundingClientRect();
      const f = Math.min(Math.max((e.clientX - r.left - 8) / (r.width - 16), 0), 1);
      this.onSeek(f * this.data.summary.length);
    };
    canvas.addEventListener("pointerdown", (e) => {
      seek(e);
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (e.buttons & 1) seek(e);
    });
  }

  setData(d: TrackData | null) {
    this.data = d;
  }

  draw(sCursor: number) {
    const d = this.data;
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
    if (!d) return;
    const L = d.summary.length;
    const pad = 8;
    const X = (s: number) => pad + (s / L) * (W - 2 * pad);
    const zs = d.pos.map((p) => p[2]);
    const zmin = Math.min(...zs);
    const zmax = Math.max(...zs);
    const Y = (f: number) => H - 14 - f * (H - 26);

    // Perfil de altura
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    d.s.forEach((s, i) => ctx.lineTo(X(s), Y((zs[i] - zmin) / (zmax - zmin || 1))));
    ctx.lineTo(X(L), Y(0));
    ctx.closePath();
    ctx.fillStyle = "rgba(148,163,184,0.18)";
    ctx.fill();

    const line = (vals: number[], max: number, color: string, upto = vals.length) => {
      ctx.beginPath();
      for (let i = 0; i < upto; i++) {
        const y = Y(Math.min(vals[i] / max, 1));
        if (i === 0) ctx.moveTo(X(d.s[i]), y);
        else ctx.lineTo(X(d.s[i]), y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    };
    const gMax = Math.max(d.summary.maxG, 4);
    for (const lvl of [3, 5]) {
      if (lvl > gMax) continue;
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = lvl === 3 ? "rgba(250,204,21,0.5)" : "rgba(239,68,68,0.55)";
      ctx.beginPath();
      ctx.moveTo(pad, Y(lvl / gMax));
      ctx.lineTo(W - pad, Y(lvl / gMax));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    line(d.kappa, d.summary.maxKappa || 1, "#e879f9");
    line(d.g, gMax, "#fb923c", d.summary.stallIndex ?? d.g.length);

    if (d.summary.stallIndex !== null) {
      const xs = X(d.s[d.summary.stallIndex]);
      ctx.fillStyle = "rgba(15,23,42,0.55)";
      ctx.fillRect(xs, 0, W - pad - xs, H);
      ctx.fillStyle = "#fca5a5";
      ctx.font = "600 11px Inter, system-ui, sans-serif";
      ctx.fillText("sin energia", xs + 6, 14);
    }

    const xc = X(sCursor);
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xc, 0);
    ctx.lineTo(xc, H);
    ctx.stroke();
    const i = Math.round(indexAtS(d, sCursor));
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(xc, Y((zs[i] - zmin) / (zmax - zmin || 1)), 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
