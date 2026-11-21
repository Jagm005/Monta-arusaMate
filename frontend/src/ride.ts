import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { v3, valueAt } from "./frames";
import type { World } from "./scene";
import type { RideState, TrackData, Vec3 } from "./types";

export const COLORES = { T: 0x22c55e, v: 0x3b82f6, a: 0xf59e0b };
type Flecha = keyof typeof COLORES;

function etiqueta(texto: string, color: number) {
  const el = document.createElement("div");
  el.className = "vec-label";
  el.textContent = texto;
  el.style.color = "#" + color.toString(16).padStart(6, "0");
  return new CSS2DObject(el);
}

/** El carrito y las flechas de T, v y a. */
export class Ride {
  readonly cart = new THREE.Group();
  private flechas = {} as Record<Flecha, THREE.ArrowHelper>;
  private etiquetas = {} as Record<Flecha, CSS2DObject>;
  private data: TrackData | null = null;
  private ups: THREE.Vector3[] = [];
  ancho = 1;

  constructor(world: World) {
    this.armarCarrito();
    world.scene.add(this.cart);
    for (const k of Object.keys(COLORES) as Flecha[]) {
      this.flechas[k] = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, COLORES[k]);
      this.etiquetas[k] = etiqueta(k, COLORES[k]);
      world.scene.add(this.flechas[k], this.etiquetas[k]);
    }
  }

  private armarCarrito() {
    const rojo = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.4 });
    const gris = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
    const caja = (w: number, h: number, d: number, mat: THREE.Material, x: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, 0, z);
      m.castShadow = true;
      this.cart.add(m);
    };
    // x = adelante, y = izquierda, z = arriba (se escala con el ancho de la via)
    caja(2.2, 1.25, 0.45, rojo, 0, 0.35);
    caja(0.5, 1.25, 0.7, rojo, 1.0, 0.6);
    caja(0.45, 1.0, 0.55, gris, 0.35, 0.75);
    caja(0.45, 1.0, 0.55, gris, -0.55, 0.75);
  }

  setData(data: TrackData, ups: THREE.Vector3[], ancho: number) {
    this.data = data;
    this.ups = ups;
    this.ancho = ancho;
    this.cart.scale.setScalar(ancho);
  }

  hide() {
    this.cart.visible = false;
    for (const k of Object.keys(COLORES) as Flecha[]) this.flechas[k].visible = this.etiquetas[k].visible = false;
  }

  /** Valores interpolados en un indice con decimales. */
  stateAt(idx: number): RideState {
    const d = this.data!;
    const i = Math.min(Math.floor(idx), d.pos.length - 1);
    const j = Math.min(i + 1, d.pos.length - 1);
    const f = idx - i;
    const mezcla = (arr: Vec3[], unitario = false): Vec3 => {
      const v = v3(arr[i]).lerp(v3(arr[j]), f);
      if (unitario) v.normalize();
      return [v.x, v.y, v.z];
    };
    const up = this.ups[i].clone().lerp(this.ups[j], f).normalize();
    return {
      t: valueAt(d.t, idx),
      s: valueAt(d.s, idx),
      pos: mezcla(d.pos),
      d1: mezcla(d.d1),
      d2: mezcla(d.d2),
      T: mezcla(d.T, true),
      up: [up.x, up.y, up.z],
      kappa: valueAt(d.kappa, idx),
      speed: valueAt(d.speed, idx),
      angle: d.angle[Math.round(idx)],
    };
  }

  update(st: RideState, ver: Record<Flecha, boolean>) {
    const p = v3(st.pos);
    const T = v3(st.T);
    const up = v3(st.up);
    this.cart.visible = true;
    this.cart.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(T, up.clone().cross(T).normalize(), up));
    this.cart.position.copy(p);

    const g = this.ancho;
    const origen = p.clone().addScaledVector(up, g * 1.2);
    const v = v3(st.d1);
    const a = v3(st.d2);
    // v y a se dibujan con la misma escala para que se puedan comparar
    const escala = (g * 5) / Math.max(v.length(), 1e-9);
    const poner = (k: Flecha, dir: THREE.Vector3, largo: number) => {
      const fl = this.flechas[k];
      fl.visible = this.etiquetas[k].visible = ver[k] && largo > 1e-3;
      if (!fl.visible) return;
      largo = Math.min(largo, g * 15);
      fl.position.copy(origen);
      fl.setDirection(dir.clone().normalize());
      fl.setLength(largo, Math.min(largo * 0.25, g * 0.9), g * 0.45);
      this.etiquetas[k].position.copy(origen).addScaledVector(dir.clone().normalize(), largo + g * 0.6);
    };
    poner("T", T, g * 3);
    poner("v", v, v.length() * escala);
    poner("a", a, a.length() * escala);
  }
}
