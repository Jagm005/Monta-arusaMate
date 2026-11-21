import "katex/dist/katex.min.css";
import "./style.css";
import * as THREE from "three";
import { fetchFormula, fetchTrack } from "./api";
import { Editor } from "./editor";
import { computeUps, indexOf, v3 } from "./frames";
import { Chart, Hud, tex } from "./hud";
import { renderManual } from "./manual";
import { EJERCICIOS, PISTAS } from "./presets";
import { Ride } from "./ride";
import { World } from "./scene";
import { TrackView } from "./track";
import type { TrackData } from "./types";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const inp = (id: string) => $<HTMLInputElement>(id);

const world = new World($("viewport"));
const pista = new TrackView(world.scene);
const ride = new Ride(world);
const editor = new Editor(world);
const chart = new Chart($<HTMLCanvasElement>("chart"));

let modo: "dibujar" | "formula" = "dibujar";
let data: TrackData | null = null;
const hud = new Hud($("hud"));
let ups: THREE.Vector3[] = [];
let tActual = 0; // el carrito se mueve con el parametro t, como en el taller
let corriendo = true;
let redibujar = true;
let camara: "orbita" | "seguir" = "orbita";
const ver = { T: true, v: true, a: true };

let timerAviso = 0;
function aviso(msg: string, error = false) {
  const el = $("toast");
  el.textContent = msg;
  el.className = error ? "error" : "";
  clearTimeout(timerAviso);
  timerAviso = window.setTimeout(() => el.classList.add("hidden"), error ? 6000 : 3500);
}

// ---------- pedirle los calculos a Python ----------
let peticion = 0;
let encuadrar = false;

async function calcular(reencuadrar = false) {
  const id = ++peticion;
  if (reencuadrar) encuadrar = true;
  try {
    let d: TrackData;
    if (modo === "dibujar") {
      const puntos = editor.getPoints();
      const minimo = inp("closed").checked ? 3 : 2;
      if (puntos.length < minimo) {
        data = null;
        pista.clear();
        ride.hide();
        chart.setData(null);
        chart.draw(0);
        $("hud").innerHTML = `<p class="hint">Pon al menos ${minimo} puntos para ver los cálculos.</p>`;
        $("summary").textContent = "";
        return;
      }
      d = await fetchTrack(puntos, inp("closed").checked);
    } else {
      d = await fetchFormula({ x: inp("fx").value, y: inp("fy").value, z: inp("fz").value, t0: +inp("t0").value, t1: +inp("t1").value });
    }
    if (id !== peticion) return; // ya hay una peticion mas nueva
    mostrar(d, encuadrar);
    encuadrar = false;
  } catch (e) {
    if (id === peticion) aviso((e as Error).message, true);
  }
}

function mostrar(d: TrackData, reencuadrar: boolean) {
  const fraccion = data ? (tActual - data.summary.t0) / (data.summary.t1 - data.summary.t0) : 0;
  data = d;
  ups = computeUps(d);

  const caja = new THREE.Box3();
  d.pos.forEach((p) => caja.expandByPoint(v3(p)));
  const tam = caja.getSize(new THREE.Vector3()).length();
  const ancho = THREE.MathUtils.clamp(tam / 55, 0.12, 1.4); // ancho de la via segun el tamano
  const sueloZ = modo === "dibujar" ? 0 : Math.min(caja.min.z - ancho * 2, 0);
  if (reencuadrar || modo === "formula") world.setGround(sueloZ, caja.getCenter(new THREE.Vector3()), Math.max(tam, 20));

  pista.build(d, ups, ancho, sueloZ);
  ride.setData(d, ups, ancho);
  chart.setData(d);
  const { t0, t1 } = d.summary;
  tActual = reencuadrar ? t0 : t0 + Math.min(Math.max(fraccion, 0), 1) * (t1 - t0);
  if (reencuadrar) world.frame(caja);

  const s = d.summary;
  $("summary").innerHTML = `
    <span class="chip">longitud <b>${s.length.toFixed(2)}</b></span>
    <span class="chip">κ máx <b>${s.maxKappa.toFixed(4)}</b></span>
    <span class="chip">radio mín <b>${s.minRadius !== null ? s.minRadius.toFixed(2) : "∞"}</b></span>
    <span class="chip">t ∈ <b>[${t0.toFixed(2)}, ${t1.toFixed(2)}]</b></span>`;

  $("latex").innerHTML = d.latex
    ? `<p class="muted small">Lo que calculó SymPy:</p>
      <div class="row">${tex(`\\mathbf r(t) = ${d.latex.r}`)}</div>
      <div class="row">${tex(`\\mathbf r'(t) = ${d.latex.d1}`)}</div>
      <div class="row">${tex(`\\mathbf r''(t) = ${d.latex.d2}`)}</div>
      <div class="row">${tex(`|\\mathbf r'(t)| = ${d.latex.speed}`)}</div>
      <div class="row">${tex(`\\kappa(t) = ${d.latex.kappa}`)}</div>
      <div class="row">${tex(`L = \\int_{${t0.toFixed(2)}}^{${t1.toFixed(2)}} |\\mathbf r'(t)|\\,dt \\approx ${s.length.toFixed(3)}`)}</div>`
    : "";
  redibujar = true;
}

// ---------- animacion ----------
world.onFrame((dt) => {
  if (!data) return;
  const { t0, t1, closed } = data.summary;
  if (corriendo) {
    tActual += dt * ((t1 - t0) / 20) * +inp("speed").value; // una vuelta dura ~20 s a velocidad 1
    if (tActual >= t1) {
      if (closed) tActual = t0 + (tActual - t1);
      else {
        tActual = t1;
        corriendo = false;
        botonPlay();
      }
    }
    redibujar = true;
  }
  if (!redibujar && camara === "orbita") return;
  redibujar = false;

  const st = ride.stateAt(indexOf(data.t, tActual));
  ride.update(st, ver);
  hud.update(st);
  chart.draw(tActual);

  if (camara === "seguir") {
    const p = v3(st.pos);
    const g = ride.ancho;
    const atras = p.clone().addScaledVector(v3(st.T), -g * 11).add(new THREE.Vector3(0, 0, g * 6));
    world.camera.position.lerp(atras, 1 - Math.exp(-dt * 4));
    world.camera.lookAt(p);
  }
});

// ---------- botones ----------
function botonPlay() {
  $("btn-play").textContent = corriendo ? "❚❚" : "▶";
}
function playPausa() {
  if (!data) return;
  if (!corriendo && tActual >= data.summary.t1 - 1e-9) tActual = data.summary.t0;
  corriendo = !corriendo;
  botonPlay();
}
$("btn-play").addEventListener("click", playPausa);
$("btn-restart").addEventListener("click", () => {
  if (!data) return;
  tActual = data.summary.t0;
  corriendo = true;
  redibujar = true;
  botonPlay();
});
chart.onSeek = (t) => {
  tActual = t;
  corriendo = false;
  redibujar = true;
  botonPlay();
};

// pestañas
document.querySelectorAll<HTMLButtonElement>(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    const nuevo = tab.dataset.tab as typeof modo;
    if (nuevo === modo) return;
    modo = nuevo;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll<HTMLElement>(".tab-body").forEach((b) => b.classList.toggle("hidden", b.dataset.body !== modo));
    editor.setEnabled(modo === "dibujar");
    if (modo === "formula") cargarEjercicio(selEj.value);
    else {
      $("latex").innerHTML = "";
      calcular(true);
    }
  }),
);

// pistas de ejemplo
const selPista = $<HTMLSelectElement>("draw-preset");
for (const [k, p] of Object.entries(PISTAS)) selPista.add(new Option(p.nombre, k));
selPista.add(new Option("— en blanco —", "blanco"));
function cargarPista(k: string) {
  if (k === "blanco") {
    editor.clear();
    calcular();
    return;
  }
  inp("closed").checked = PISTAS[k].cerrada;
  editor.setClosed(PISTAS[k].cerrada);
  editor.setPoints(PISTAS[k].puntos);
  corriendo = true;
  botonPlay();
  calcular(true);
}
selPista.addEventListener("change", () => cargarPista(selPista.value));

// ejercicios del taller
const selEj = $<HTMLSelectElement>("formula-preset");
for (const [k, e] of Object.entries(EJERCICIOS)) selEj.add(new Option(e.nombre, k));
function cargarEjercicio(k: string) {
  const e = EJERCICIOS[k];
  inp("fx").value = e.x;
  inp("fy").value = e.y;
  inp("fz").value = e.z;
  inp("t0").value = String(e.t0);
  inp("t1").value = String(e.t1);
  corriendo = true;
  botonPlay();
  calcular(true);
}
selEj.addEventListener("change", () => cargarEjercicio(selEj.value));
$("btn-formula").addEventListener("click", () => calcular(true));
["fx", "fy", "fz", "t0", "t1"].forEach((id) => inp(id).addEventListener("keydown", (e) => e.key === "Enter" && calcular(true)));

// editor
let timerEditor = 0;
editor.onChange = (final) => {
  clearTimeout(timerEditor);
  timerEditor = window.setTimeout(() => calcular(), final ? 0 : 90);
};
inp("closed").addEventListener("change", () => {
  editor.setClosed(inp("closed").checked);
  calcular();
});
$("btn-delete").addEventListener("click", () => editor.removeSelected());
$("btn-clear").addEventListener("click", () => {
  selPista.value = "blanco";
  cargarPista("blanco");
  aviso("Haz clic en el suelo para poner el primer punto.");
});

// slider de altura: cambia el punto seleccionado (y la altura de los puntos nuevos)
inp("height").addEventListener("input", () => {
  const z = +inp("height").value;
  editor.height = z;
  editor.setSelectedHeight(z);
  $("height-val").textContent = `${z} m`;
});
editor.onSelect = (p) => {
  $("height-label").textContent = p ? `Altura de P${p.indice + 1}:` : "Altura del siguiente punto:";
  if (p) {
    const z = Math.round(p.z);
    inp("height").value = String(z);
    editor.height = z;
    $("height-val").textContent = `${z} m`;
  }
};
inp("speed").addEventListener("input", () => ($("speed-val").textContent = `${inp("speed").value}×`));

// "ir a t = ..." para revisar un ejercicio en t1
function leerT(texto: string): number {
  const limpio = texto.toLowerCase().replace(/\s+/g, "").replace(/π/g, "pi");
  if (!/^(pi|ln|sqrt|[0-9.+\-*/()])+$/.test(limpio)) throw new Error();
  const js = limpio.replace(/pi/g, `(${Math.PI})`).replace(/ln/g, "Math.log").replace(/sqrt/g, "Math.sqrt");
  const v = Function(`"use strict"; return (${js});`)() as number;
  if (!isFinite(v)) throw new Error();
  return v;
}
$("btn-goto").addEventListener("click", () => {
  if (!data) return;
  let t: number;
  try {
    t = leerT(inp("goto-t").value);
  } catch {
    aviso("Escribe t como número, pi, pi/4, ln(2)...", true);
    return;
  }
  if (t < data.summary.t0 || t > data.summary.t1) {
    aviso(`t = ${t.toFixed(3)} está fuera del intervalo de la curva.`, true);
    return;
  }
  tActual = t;
  corriendo = false;
  redibujar = true;
  botonPlay();
  aviso(`Carrito en t = ${t.toFixed(4)}. Compara con lo que hiciste a mano.`);
});

// que flechas se ven
document.querySelectorAll<HTMLInputElement>("[data-vis]").forEach((cb) =>
  cb.addEventListener("change", () => {
    ver[cb.dataset.vis as keyof typeof ver] = cb.checked;
    redibujar = true;
  }),
);
$<HTMLSelectElement>("camera-mode").addEventListener("change", (e) => {
  camara = (e.target as HTMLSelectElement).value as typeof camara;
  world.controls.enabled = camara === "orbita";
  if (camara === "orbita" && data) {
    const caja = new THREE.Box3();
    data.pos.forEach((p) => caja.expandByPoint(v3(p)));
    world.frame(caja);
  }
  redibujar = true;
});

window.addEventListener("keydown", (e) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === "INPUT" || tag === "SELECT") return;
  if (e.key === "Delete" || e.key === "Backspace") editor.removeSelected();
  else if (e.key === "Escape") editor.select(null);
  else if (e.key === " ") {
    e.preventDefault();
    playPausa();
  }
});

// manual
const dialogo = $<HTMLDialogElement>("manual");
$("btn-manual").addEventListener("click", () => {
  if (!$("manual-body").innerHTML) $("manual-body").innerHTML = renderManual();
  dialogo.showModal();
});
$("btn-close-manual").addEventListener("click", () => dialogo.close());
dialogo.addEventListener("click", (e) => e.target === dialogo && dialogo.close());

botonPlay();
cargarPista("clasica");
