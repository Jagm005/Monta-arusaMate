import "katex/dist/katex.min.css";
import "./style.css";
import * as THREE from "three";
import { fetchFormula, fetchTrack } from "./api";
import { Editor } from "./editor";
import { computeUps, indexAtS, indexAtTime, v3, valueAt } from "./frames";
import { Chart, Hud, tex } from "./hud";
import { renderManual } from "./manual";
import { DRAW_PRESETS, FORMULA_PRESETS } from "./presets";
import { Ride, type Visible } from "./ride";
import { World } from "./scene";
import { TrackView, type ColorMode } from "./track";
import type { TrackData } from "./types";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => $<HTMLInputElement>(id);

// ---------- Mundo 3D ----------
const world = new World($("viewport"));
const trackView = new TrackView(world.scene);
const ride = new Ride(world);
const editor = new Editor(world);
const hud = new Hud($("hud"));
const chart = new Chart($<HTMLCanvasElement>("chart"));

// ---------- Estado ----------
let mode: "draw" | "formula" = "draw";
let data: TrackData | null = null;
let ups: THREE.Vector3[] = [];
let cursor = 0; // indice fraccionario donde esta el carrito
let playing = true;
let request = 0;
let needsFrame = true;
const vis: Visible = { T: true, N: true, B: false, a: false, circle: true };
let colorMode: ColorMode = "g";
let cameraMode: "orbit" | "follow" | "rider" = "orbit";

const physics = () => ({ v0: +input("v0").value, mu: +input("mu").value });

// ---------- Mensajes ----------
let toastTimer = 0;
function toast(msg: string, kind: "info" | "error" = "info", ms = 3500) {
  const el = $("toast");
  el.textContent = msg;
  el.className = kind;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.add("hidden"), ms);
}

// ---------- Construir la pista (llama a Python) ----------
let pendingReframe = false; // una peticion nueva puede reemplazar a otra que pedia reencuadrar

async function rebuild(opts: { reframe?: boolean } = {}) {
  const id = ++request;
  if (opts.reframe) pendingReframe = true;
  try {
    let d: TrackData;
    if (mode === "draw") {
      const pts = editor.getPoints();
      const min = input("closed").checked ? 3 : 2;
      if (pts.length < min) {
        trackView.clear();
        data = null;
        ride.hide();
        $("hud").innerHTML = `<p class="hint">Aquí aparecerán r(t), T, N, B, κ y las fuerzas G cuando la pista tenga suficientes puntos.</p>`;
        $("summary").innerHTML = `<span class="muted">Agrega al menos ${min} puntos haciendo clic en el suelo.</span>`;
        chart.setData(null);
        chart.draw(0);
        return;
      }
      d = await fetchTrack(pts, input("closed").checked, physics());
    } else {
      d = await fetchFormula(
        { x: input("fx").value, y: input("fy").value, z: input("fz").value, t0: +input("t0").value, t1: +input("t1").value },
        physics(),
      );
    }
    if (id !== request) return; // llego una respuesta mas nueva
    applyData(d, pendingReframe);
    pendingReframe = false;
  } catch (e) {
    if (id === request) toast((e as Error).message, "error", 6000);
  }
}

function applyData(d: TrackData, reframe: boolean) {
  const prevS = data ? valueAt(data.s, cursor) : 0;
  data = d;
  ups = computeUps(d);

  const box = new THREE.Box3();
  d.pos.forEach((p) => box.expandByPoint(v3(p)));
  const size = box.getSize(new THREE.Vector3()).length();
  const gauge = THREE.MathUtils.clamp(size / 55, 0.12, 1.4);
  const groundZ = mode === "draw" ? 0 : Math.min(box.min.z - gauge * 2, 0);
  if (reframe || mode === "formula") world.setGround(groundZ, box.getCenter(new THREE.Vector3()), Math.max(size, 20));

  trackView.build(d, ups, gauge, groundZ, colorMode);
  ride.setData(d, ups, gauge, size);
  ride.cart.visible = true;
  chart.setData(d);
  cursor = Math.min(indexAtS(d, prevS), d.pos.length - 1);
  if (reframe) {
    cursor = 0;
    world.frame(box);
  }
  renderSummary(d);
  renderLatex(d);
  needsFrame = true;
  if (d.summary.stallIndex !== null) {
    toast(`⚠️ El carrito no tiene energía para pasar la colina en s = ${d.s[d.summary.stallIndex].toFixed(1)} m (v² ≤ 0). Sube v₀ o baja esa colina.`, "error", 7000);
  }
}

function renderSummary(d: TrackData) {
  const s = d.summary;
  const gCls = s.maxG >= 5 ? "bad" : s.maxG >= 3 ? "warn" : "ok";
  $("summary").innerHTML = `
    <span class="chip"><b>${s.length.toFixed(1)} m</b> de riel</span>
    <span class="chip">κ máx <b>${s.maxKappa.toFixed(3)}</b></span>
    <span class="chip">radio mín <b>${s.minRadius !== null ? s.minRadius.toFixed(1) + " m" : "∞"}</b></span>
    <span class="chip ${gCls}">G máx <b>${s.maxG.toFixed(2)}</b></span>
    <span class="chip">v máx <b>${(s.maxSpeed * 3.6).toFixed(0)} km/h</b></span>
    <span class="chip">${s.closed ? "vuelta" : "recorrido"} <b>${s.duration.toFixed(1)} s</b></span>
    ${s.stallIndex !== null ? `<span class="chip bad">se detiene</span>` : ""}`;
}

function renderLatex(d: TrackData) {
  const box = $("latex");
  if (!d.latex) {
    box.innerHTML = "";
    return;
  }
  const L = d.latex;
  box.innerHTML = `
    <p class="muted small">Calculado de forma exacta por SymPy:</p>
    <div class="row">${tex(`\\mathbf r(t) = ${L.r}`)}</div>
    <div class="row">${tex(`\\mathbf r'(t) = ${L.d1}`)}</div>
    <div class="row">${tex(`\\mathbf r''(t) = ${L.d2}`)}</div>
    <div class="row">${tex(`|\\mathbf r'(t)| = ${L.speed}`)}</div>
    <div class="row">${tex(`\\mathbf T(t) = ${L.T}`)}</div>
    <div class="row">${tex(`\\kappa(t) = ${L.kappa}`)}</div>
    <div class="row">${tex(`L = \\int_{t_0}^{t_1} |\\mathbf r'(t)|\\,dt \\approx ${d.summary.length.toFixed(3)}`)}</div>`;
}

// ---------- Bucle de animacion ----------
world.onFrame((dt) => {
  if (!data) return;
  const d = data;
  const n = d.pos.length;
  if (playing) {
    const total = d.time[n - 1];
    let time = valueAt(d.time, cursor) + dt * +input("speed").value;
    const stall = d.summary.stallIndex;
    if (stall !== null && cursor >= stall - 1e-6) {
      playing = false;
      updatePlayButton();
    } else if (time >= total) {
      if (d.summary.closed) time -= total;
      else {
        time = total;
        playing = false;
        updatePlayButton();
      }
    }
    cursor = indexAtTime(d, time);
    needsFrame = true;
  }
  if (!needsFrame && cameraMode === "orbit") return;
  needsFrame = false;

  const st = ride.stateAt(cursor);
  ride.update(st, vis);
  hud.update(st);
  chart.draw(st.s);

  if (cameraMode !== "orbit") {
    const p = v3(st.pos);
    const T = v3(st.T);
    const up = v3(st.up);
    const g = ride.gauge;
    if (cameraMode === "rider") {
      world.camera.up.copy(up);
      world.camera.position.copy(p).addScaledVector(up, g * 1.6).addScaledVector(T, g * 0.2);
      world.camera.lookAt(p.clone().addScaledVector(T, g * 12).addScaledVector(up, g * 1.0));
    } else {
      world.camera.up.set(0, 0, 1);
      const target = p.clone().addScaledVector(T, -g * 11).add(new THREE.Vector3(0, 0, g * 6));
      world.camera.position.lerp(target, 1 - Math.exp(-dt * 4));
      world.camera.lookAt(p);
    }
  }
});

// ---------- Controles ----------
function updatePlayButton() {
  $("btn-play").textContent = playing ? "❚❚" : "▶";
}
function togglePlay() {
  if (!data) return;
  const n = data.pos.length;
  const stall = data.summary.stallIndex;
  if (!playing && (cursor >= n - 1.001 || (stall !== null && cursor >= stall - 1e-6))) cursor = 0;
  playing = !playing;
  updatePlayButton();
}
$("btn-play").addEventListener("click", togglePlay);
$("btn-restart").addEventListener("click", () => {
  cursor = 0;
  playing = true;
  needsFrame = true;
  updatePlayButton();
});
chart.onSeek = (s) => {
  if (!data) return;
  cursor = indexAtS(data, s);
  playing = false;
  needsFrame = true;
  updatePlayButton();
};

// Pestanas
document.querySelectorAll<HTMLButtonElement>(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    const next = tab.dataset.tab as "draw" | "formula";
    if (next === mode) return;
    mode = next;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll<HTMLElement>(".tab-body").forEach((b) => b.classList.toggle("hidden", b.dataset.body !== mode));
    editor.setEnabled(mode === "draw");
    if (mode === "formula") loadFormulaPreset($<HTMLSelectElement>("formula-preset").value);
    else rebuild({ reframe: true });
  }),
);

// Presets de dibujo
const drawSel = $<HTMLSelectElement>("draw-preset");
for (const [k, p] of Object.entries(DRAW_PRESETS)) drawSel.add(new Option(p.label, k));
drawSel.add(new Option("— pista en blanco —", "blank"));
function loadDrawPreset(key: string) {
  if (key === "blank") {
    editor.clear();
    trackView.clear();
    rebuild();
    return;
  }
  const p = DRAW_PRESETS[key];
  input("closed").checked = p.closed;
  editor.setClosed(p.closed);
  setRange("v0", p.v0);
  editor.setPoints(p.points);
  playing = true;
  updatePlayButton();
  rebuild({ reframe: true });
}
drawSel.addEventListener("change", () => loadDrawPreset(drawSel.value));

// Presets de formula
const fSel = $<HTMLSelectElement>("formula-preset");
for (const [k, p] of Object.entries(FORMULA_PRESETS)) fSel.add(new Option(p.label, k));
function loadFormulaPreset(key: string) {
  const p = FORMULA_PRESETS[key];
  input("fx").value = p.x;
  input("fy").value = p.y;
  input("fz").value = p.z;
  input("t0").value = String(p.t0);
  input("t1").value = String(p.t1);
  setRange("v0", p.v0);
  playing = true;
  updatePlayButton();
  rebuild({ reframe: true });
}
fSel.addEventListener("change", () => loadFormulaPreset(fSel.value));
$("btn-formula").addEventListener("click", () => rebuild({ reframe: true }));
["fx", "fy", "fz", "t0", "t1"].forEach((id) =>
  input(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") rebuild({ reframe: true });
  }),
);

// Editor
let liveTimer = 0;
editor.onChange = (final) => {
  clearTimeout(liveTimer);
  liveTimer = window.setTimeout(() => rebuild(), final ? 0 : 90);
};
input("closed").addEventListener("change", () => {
  editor.setClosed(input("closed").checked);
  rebuild();
});
$("btn-delete").addEventListener("click", () => editor.removeSelected());
$("btn-clear").addEventListener("click", () => {
  drawSel.value = "blank";
  loadDrawPreset("blank");
  toast("Haz clic en el suelo para poner el primer punto.");
});

// Fisica
function setRange(id: string, value: number) {
  input(id).value = String(value);
  input(id).dispatchEvent(new Event("input"));
}
const labels: Record<string, (v: number) => string> = {
  v0: (v) => `${v} m/s`,
  mu: (v) => v.toFixed(3),
  speed: (v) => `${v}×`,
  height: (v) => `${v} m`,
};
for (const id of Object.keys(labels)) {
  input(id).addEventListener("input", () => {
    $(`${id}-val`).textContent = labels[id](+input(id).value);
    if (id === "height") editor.height = +input(id).value;
  });
}
let physTimer = 0;
["v0", "mu"].forEach((id) =>
  input(id).addEventListener("input", () => {
    clearTimeout(physTimer);
    physTimer = window.setTimeout(() => rebuild(), 120);
  }),
);

// Ir a t = t1 (para comprobar ejercicios)
function parseT(text: string): number {
  const clean = text.toLowerCase().replace(/\s+/g, "").replace(/π/g, "pi");
  if (!clean || !/^(pi|ln|sqrt|[0-9.+\-*/()])+$/.test(clean)) throw new Error("valor de t no valido");
  const js = clean.replace(/pi/g, `(${Math.PI})`).replace(/ln/g, "Math.log").replace(/sqrt/g, "Math.sqrt");
  const v = Function(`"use strict"; return (${js});`)() as number;
  if (!isFinite(v)) throw new Error("valor de t no valido");
  return v;
}
$("btn-goto").addEventListener("click", () => {
  if (!data) return;
  let target: number;
  try {
    target = parseT(input("goto-t").value);
  } catch {
    toast("Escribe t como numero, pi, pi/4, ln(2)...", "error");
    return;
  }
  const t = data.t;
  for (let i = 0; i < t.length - 1; i++) {
    if (t[i + 1] > t[i] && (t[i] - target) * (t[i + 1] - target) <= 0) {
      cursor = i + (target - t[i]) / (t[i + 1] - t[i]);
      playing = false;
      needsFrame = true;
      updatePlayButton();
      toast(`Carrito en t = ${target.toFixed(4)}: compara el panel derecho con tu calculo a mano.`);
      return;
    }
  }
  toast(`t = ${target.toFixed(3)} esta fuera del intervalo de la curva.`, "error");
});

// Vista
document.querySelectorAll<HTMLInputElement>("[data-vis]").forEach((cb) =>
  cb.addEventListener("change", () => {
    vis[cb.dataset.vis as keyof Visible] = cb.checked;
    needsFrame = true;
  }),
);
$<HTMLSelectElement>("color-mode").addEventListener("change", (e) => {
  colorMode = (e.target as HTMLSelectElement).value as ColorMode;
  trackView.recolor(colorMode);
});
$<HTMLSelectElement>("camera-mode").addEventListener("change", (e) => {
  cameraMode = (e.target as HTMLSelectElement).value as typeof cameraMode;
  world.controls.enabled = cameraMode === "orbit";
  world.camera.up.set(0, 0, 1);
  if (cameraMode === "orbit" && data) {
    const box = new THREE.Box3();
    data.pos.forEach((p) => box.expandByPoint(v3(p)));
    world.frame(box);
  }
  needsFrame = true;
});

// Teclado
window.addEventListener("keydown", (e) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
  if (e.key === "Delete" || e.key === "Backspace") editor.removeSelected();
  else if (e.key === "Escape") editor.select(null);
  else if (e.key === " ") {
    e.preventDefault();
    togglePlay();
  }
});

// Manual
const dialog = $<HTMLDialogElement>("manual");
$("btn-manual").addEventListener("click", () => {
  const body = $("manual-body");
  if (!body.innerHTML) body.innerHTML = renderManual();
  dialog.showModal();
});
$("btn-close-manual").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close();
});

if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__app = { world, editor, getData: () => data };

// ---------- Inicio ----------
updatePlayButton();
loadDrawPreset("clasica");
