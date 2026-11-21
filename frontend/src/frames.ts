import * as THREE from "three";
import type { TrackData, Vec3 } from "./types";

export const v3 = (a: Vec3) => new THREE.Vector3(a[0], a[1], a[2]);

/**
 * Vector "arriba" del carrito en cada muestra.
 *
 * No usamos N directamente: N apunta al centro de la curva y salta de lado en
 * los puntos de inflexion, y el carrito daria volteretas. Usamos un marco de
 * "minima rotacion" (doble reflexion) que se mantiene perpendicular a T y gira
 * lo menos posible: asi se ve como un vagon de verdad, incluso en un loop.
 */
export function computeUps(data: TrackData): THREE.Vector3[] {
  const n = data.pos.length;
  const P = data.pos.map(v3);
  const T = data.T.map(v3);
  const ups: THREE.Vector3[] = new Array(n);

  const z = new THREE.Vector3(0, 0, 1);
  let r = z.clone().sub(T[0].clone().multiplyScalar(z.dot(T[0])));
  if (r.lengthSq() < 1e-6) r = v3(data.N[0]).negate();
  ups[0] = r.normalize();

  for (let i = 0; i < n - 1; i++) {
    const v1 = P[i + 1].clone().sub(P[i]);
    const c1 = v1.dot(v1);
    if (c1 < 1e-12) {
      ups[i + 1] = ups[i].clone();
      continue;
    }
    const rL = ups[i].clone().sub(v1.clone().multiplyScalar((2 / c1) * v1.dot(ups[i])));
    const tL = T[i].clone().sub(v1.clone().multiplyScalar((2 / c1) * v1.dot(T[i])));
    const v2 = T[i + 1].clone().sub(tL);
    const c2 = v2.dot(v2);
    const next = c2 < 1e-12 ? rL : rL.sub(v2.multiplyScalar((2 / c2) * v2.dot(rL)));
    ups[i + 1] = next.normalize();
  }

  // En pistas cerradas repartimos el giro sobrante para que el final empate con el inicio.
  if (data.summary.closed && n > 2) {
    const a = ups[n - 1];
    const b = ups[0];
    const angle = Math.atan2(a.clone().cross(b).dot(T[0]), a.dot(b));
    const L = data.s[n - 1] || 1;
    for (let i = 0; i < n; i++) {
      ups[i].applyAxisAngle(T[i], (angle * data.s[i]) / L).normalize();
    }
  }
  return ups;
}

/** Indice (con fraccion) cuya longitud de arco es s. */
export function indexAtS(data: TrackData, s: number): number {
  return search(data.s, s);
}

/** Indice (con fraccion) que corresponde al tiempo fisico dado. */
export function indexAtTime(data: TrackData, time: number): number {
  return search(data.time, time);
}

function search(arr: number[], x: number): number {
  const n = arr.length;
  if (x <= arr[0]) return 0;
  if (x >= arr[n - 1]) {
    let i = n - 1;
    while (i > 0 && arr[i - 1] >= arr[n - 1]) i--; // primer indice con el valor final
    return i;
  }
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= x) lo = mid;
    else hi = mid;
  }
  const span = arr[hi] - arr[lo];
  return lo + (span > 0 ? (x - arr[lo]) / span : 0);
}

export function valueAt(arr: number[], idx: number): number {
  const i = Math.min(Math.floor(idx), arr.length - 1);
  const j = Math.min(i + 1, arr.length - 1);
  const f = idx - i;
  return arr[i] * (1 - f) + arr[j] * f;
}
