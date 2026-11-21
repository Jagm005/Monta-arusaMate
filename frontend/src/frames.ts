import * as THREE from "three";
import type { TrackData, Vec3 } from "./types";

export const v3 = (a: Vec3) => new THREE.Vector3(a[0], a[1], a[2]);

/**
 * Hacia donde es "arriba" para el carrito en cada punto de la pista.
 * Es solo para dibujar el carrito derecho, no es parte de los calculos.
 * Vamos girando el "arriba" anterior lo minimo para que siga perpendicular a T.
 */
export function computeUps(data: TrackData): THREE.Vector3[] {
  const n = data.pos.length;
  const P = data.pos.map(v3);
  const T = data.T.map(v3);
  const ups: THREE.Vector3[] = [];

  const z = new THREE.Vector3(0, 0, 1);
  let r = z.clone().addScaledVector(T[0], -z.dot(T[0]));
  if (r.lengthSq() < 1e-6) r = new THREE.Vector3(1, 0, 0).addScaledVector(T[0], -T[0].x);
  ups.push(r.normalize());

  for (let i = 0; i < n - 1; i++) {
    const v1 = P[i + 1].clone().sub(P[i]);
    const c1 = v1.dot(v1);
    if (c1 < 1e-12) {
      ups.push(ups[i].clone());
      continue;
    }
    const rL = ups[i].clone().addScaledVector(v1, (-2 / c1) * v1.dot(ups[i]));
    const tL = T[i].clone().addScaledVector(v1, (-2 / c1) * v1.dot(T[i]));
    const v2 = T[i + 1].clone().sub(tL);
    const c2 = v2.dot(v2);
    ups.push((c2 < 1e-12 ? rL : rL.addScaledVector(v2, (-2 / c2) * v2.dot(rL))).normalize());
  }

  // si la pista es cerrada, repartimos el giro que sobra para que cierre bien
  if (data.summary.closed && n > 2) {
    const a = ups[n - 1];
    const ang = Math.atan2(a.clone().cross(ups[0]).dot(T[0]), a.dot(ups[0]));
    for (let i = 0; i < n; i++) ups[i].applyAxisAngle(T[i], (ang * data.s[i]) / data.summary.length).normalize();
  }
  return ups;
}

/** Posicion (indice con decimales) dentro de un arreglo ordenado. */
export function indexOf(arr: number[], x: number): number {
  const n = arr.length;
  if (x <= arr[0]) return 0;
  if (x >= arr[n - 1]) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= x) lo = mid;
    else hi = mid;
  }
  return lo + (x - arr[lo]) / (arr[hi] - arr[lo] || 1);
}

export function valueAt(arr: number[], idx: number): number {
  const i = Math.min(Math.floor(idx), arr.length - 1);
  const j = Math.min(i + 1, arr.length - 1);
  return arr[i] + (arr[j] - arr[i]) * (idx - i);
}
