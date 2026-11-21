import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { v3, valueAt } from "./frames";
import type { World } from "./scene";
import type { RideState, TrackData, Vec3 } from "./types";

export interface Visible {
  T: boolean;
  N: boolean;
  B: boolean;
  a: boolean;
  circle: boolean;
}

export const COLORS = { T: 0x22c55e, N: 0xef4444, B: 0x3b82f6, a: 0xf59e0b, circle: 0xe879f9 };

function label(text: string, color: number) {
  const el = document.createElement("div");
  el.className = "vec-label";
  el.textContent = text;
  el.style.color = `#${color.toString(16).padStart(6, "0")}`;
  return new CSS2DObject(el);
}

/** El carrito, sus vectores T, N, B, a y el circulo osculador. */
export class Ride {
  readonly cart = new THREE.Group();
  private arrows: Record<"T" | "N" | "B" | "a", THREE.ArrowHelper>;
  private labels: Record<"T" | "N" | "B" | "a", CSS2DObject>;
  private circle: THREE.LineLoop;
  private center: THREE.Mesh;
  private radiusLine: THREE.Line;
  private data: TrackData | null = null;
  private ups: THREE.Vector3[] = [];
  gauge = 1;
  private sceneSize = 50;

  constructor(world: World) {
    this.buildCart();
    world.scene.add(this.cart);
    this.arrows = {} as typeof this.arrows;
    this.labels = {} as typeof this.labels;
    const names: Record<"T" | "N" | "B" | "a", string> = { T: "T", N: "N", B: "B", a: "a" };
    for (const k of ["T", "N", "B", "a"] as const) {
      this.arrows[k] = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, COLORS[k]);
      (this.arrows[k].line.material as THREE.LineBasicMaterial).linewidth = 2;
      this.labels[k] = label(names[k], COLORS[k]);
      world.scene.add(this.arrows[k], this.labels[k]);
    }
    const geo = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(160 * 3), 3));
    this.circle = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: COLORS.circle, transparent: true, opacity: 0.9 }));
    this.circle.frustumCulled = false;
    this.center = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: COLORS.circle }));
    this.radiusLine = new THREE.Line(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3)),
      new THREE.LineDashedMaterial({ color: COLORS.circle, dashSize: 0.6, gapSize: 0.4 }),
    );
    this.radiusLine.frustumCulled = false;
    world.scene.add(this.circle, this.center, this.radiusLine);
  }

  private buildCart() {
    const body = new THREE.MeshStandardMaterial({ color: 0xe11d48, metalness: 0.3, roughness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.3 });
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.cart.add(m);
      return m;
    };
    // Medidas en "anchos de via"; se escala con this.gauge. x = adelante, y = izquierda, z = arriba.
    add(new THREE.BoxGeometry(2.2, 1.25, 0.45), body, 0, 0, 0.35);
    add(new THREE.BoxGeometry(0.5, 1.25, 0.7), body, 1.0, 0, 0.6);
    for (const x of [0.35, -0.55]) {
      add(new THREE.BoxGeometry(0.45, 1.0, 0.55), dark, x, 0, 0.75);
      add(new THREE.CylinderGeometry(0.05, 0.05, 1.15, 8), gold, x + 0.3, 0, 0.95).rotation.x = Math.PI / 2;
    }
    const wheel = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12);
    for (const x of [0.75, -0.75]) for (const y of [0.5, -0.5]) add(wheel, dark, x, y, 0.08);
  }

  setData(data: TrackData, ups: THREE.Vector3[], gauge: number, sceneSize: number) {
    this.data = data;
    this.ups = ups;
    this.gauge = gauge;
    this.sceneSize = sceneSize;
    this.cart.scale.setScalar(gauge);
    this.center.scale.setScalar(gauge * 0.18);
    (this.radiusLine.material as THREE.LineDashedMaterial).dashSize = gauge * 0.6;
    (this.radiusLine.material as THREE.LineDashedMaterial).gapSize = gauge * 0.4;
  }

  hide() {
    this.cart.visible = this.circle.visible = this.center.visible = this.radiusLine.visible = false;
    for (const k of ["T", "N", "B", "a"] as const) this.arrows[k].visible = this.labels[k].visible = false;
  }

  /** Interpola todas las magnitudes en un indice fraccionario. */
  stateAt(idx: number): RideState {
    const d = this.data!;
    const n = d.pos.length;
    idx = THREE.MathUtils.clamp(idx, 0, n - 1);
    const i = Math.min(Math.floor(idx), n - 1);
    const j = Math.min(i + 1, n - 1);
    const f = idx - i;
    const lerp3 = (arr: Vec3[], unit = false): Vec3 => {
      const v = v3(arr[i]).lerp(v3(arr[j]), f);
      if (unit) v.normalize();
      return [v.x, v.y, v.z];
    };
    const up = this.ups[i].clone().lerp(this.ups[j], f).normalize();
    const stall = d.summary.stallIndex;
    return {
      index: idx,
      t: valueAt(d.t, idx),
      s: valueAt(d.s, idx),
      pos: lerp3(d.pos),
      d1: lerp3(d.d1),
      d2: lerp3(d.d2),
      T: lerp3(d.T, true),
      N: lerp3(d.N, true),
      B: lerp3(d.B, true),
      up: [up.x, up.y, up.z],
      kappa: valueAt(d.kappa, idx),
      v: valueAt(d.v, idx),
      aT: valueAt(d.aT, idx),
      aN: valueAt(d.aN, idx),
      g: valueAt(d.g, idx),
      stalled: stall !== null && idx >= stall,
    };
  }

  update(st: RideState, vis: Visible) {
    const p = v3(st.pos);
    const T = v3(st.T);
    const N = v3(st.N);
    const B = v3(st.B);
    const up = v3(st.up);
    const left = up.clone().cross(T).normalize();
    const g = this.gauge;

    const m = new THREE.Matrix4().makeBasis(T, left, up);
    this.cart.quaternion.setFromRotationMatrix(m);
    this.cart.position.copy(p);

    const len = g * 4.5;
    const origin = p.clone().addScaledVector(up, g * 1.2);
    const set = (k: "T" | "N" | "B" | "a", dir: THREE.Vector3, l: number, show: boolean) => {
      const a = this.arrows[k];
      a.visible = show && l > 1e-3;
      this.labels[k].visible = a.visible;
      if (!a.visible) return;
      a.position.copy(origin);
      a.setDirection(dir.clone().normalize());
      a.setLength(l, Math.min(l * 0.25, g * 0.9), g * 0.45);
      this.labels[k].position.copy(origin).addScaledVector(dir.clone().normalize(), l + g * 0.6);
    };
    set("T", T, len, vis.T);
    set("N", N, len, vis.N && st.kappa > 1e-5);
    set("B", B, len, vis.B);
    const acc = T.clone().multiplyScalar(st.aT).addScaledVector(N, st.aN);
    set("a", acc, (acc.length() / 9.81) * g * 2.5, vis.a && !st.stalled);

    // Circulo osculador: centro = r + N/kappa, radio = 1/kappa, en el plano de T y N.
    const R = st.kappa > 1e-6 ? 1 / st.kappa : Infinity;
    const showCircle = vis.circle && R < this.sceneSize * 2.5;
    this.circle.visible = this.center.visible = this.radiusLine.visible = showCircle;
    if (showCircle) {
      const c = p.clone().addScaledVector(N, R);
      const pos = this.circle.geometry.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < pos.count; k++) {
        const th = (k / pos.count) * Math.PI * 2;
        const q = c.clone().addScaledVector(N, -R * Math.cos(th)).addScaledVector(T, R * Math.sin(th));
        pos.setXYZ(k, q.x, q.y, q.z);
      }
      pos.needsUpdate = true;
      this.center.position.copy(c);
      const rl = this.radiusLine.geometry.attributes.position as THREE.BufferAttribute;
      rl.setXYZ(0, p.x, p.y, p.z);
      rl.setXYZ(1, c.x, c.y, c.z);
      rl.needsUpdate = true;
      this.radiusLine.computeLineDistances();
    }
  }
}
