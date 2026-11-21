import * as THREE from "three";
import { indexAtS, v3 } from "./frames";
import type { TrackData } from "./types";

export type ColorMode = "g" | "kappa";

/** Color de un tramo: verde (suave) -> amarillo -> rojo (intenso). */
export function heatColor(data: TrackData, i: number, mode: ColorMode): THREE.Color {
  const stall = data.summary.stallIndex;
  if (mode === "g" && stall !== null && i >= stall) return new THREE.Color(0x777777);
  const x =
    mode === "g"
      ? THREE.MathUtils.clamp((data.g[i] - 1) / 4, 0, 1) // 1G verde ... 5G rojo
      : THREE.MathUtils.clamp(data.kappa[i] / (data.summary.maxKappa || 1), 0, 1);
  return new THREE.Color().setHSL(0.33 * (1 - x), 0.9, 0.5);
}

/** Dibuja la pista: dos rieles, la "columna" coloreada, durmientes y soportes. */
export class TrackView {
  readonly group = new THREE.Group();
  private heat: THREE.Mesh | null = null;
  private heatCurve: THREE.CatmullRomCurve3 | null = null;
  private data: TrackData | null = null;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  clear() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
    });
    this.group.clear();
    this.heat = null;
  }

  build(data: TrackData, ups: THREE.Vector3[], gauge: number, groundZ: number, mode: ColorMode) {
    this.clear();
    this.data = data;
    const closed = data.summary.closed;
    const n = closed ? data.pos.length - 1 : data.pos.length;
    const P = data.pos.slice(0, n).map(v3);
    const T = data.T.map(v3);
    const sides = T.map((t, i) => ups[i].clone().cross(t).normalize()); // izquierda = arriba x adelante
    const segs = Math.min(n * 2, 2400);

    const railMat = new THREE.MeshStandardMaterial({ color: 0xd9dee6, metalness: 0.85, roughness: 0.3 });
    for (const sign of [1, -1]) {
      const pts = P.map((p, i) => p.clone().addScaledVector(sides[i], (sign * gauge) / 2));
      const curve = new THREE.CatmullRomCurve3(pts, closed, "catmullrom", 0);
      const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, gauge * 0.07, 8, closed), railMat);
      rail.castShadow = true;
      this.group.add(rail);
    }

    // Columna central coloreada por fuerza G o curvatura.
    const spine = P.map((p, i) => p.clone().addScaledVector(ups[i], -gauge * 0.32));
    this.heatCurve = new THREE.CatmullRomCurve3(spine, closed, "catmullrom", 0);
    const heatGeo = new THREE.TubeGeometry(this.heatCurve, segs, gauge * 0.17, 10, closed);
    this.heat = new THREE.Mesh(
      heatGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, emissiveIntensity: 0.2 }),
    );
    this.heat.castShadow = true;
    this.group.add(this.heat);
    this.recolor(mode);

    // Durmientes (travesanos) cada ~1.4 anchos de via.
    const step = gauge * 1.4;
    const count = Math.floor(data.summary.length / step);
    const ties = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x3b4352, roughness: 0.8 }),
      count,
    );
    const m = new THREE.Matrix4();
    const scale = new THREE.Matrix4().makeScale(gauge * 0.22, gauge * 1.25, gauge * 0.12);
    for (let k = 0; k < count; k++) {
      const i = Math.round(indexAtS(data, k * step)) % n;
      m.makeBasis(T[i], sides[i], ups[i]).setPosition(P[i].clone().addScaledVector(ups[i], -gauge * 0.1));
      ties.setMatrixAt(k, m.clone().multiply(scale));
    }
    ties.castShadow = true;
    this.group.add(ties);

    // Soportes verticales hasta el suelo (solo donde la via no esta invertida).
    const sStep = gauge * 7;
    const sCount = Math.floor(data.summary.length / sStep);
    const supports = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 1, 8),
      new THREE.MeshStandardMaterial({ color: 0xf1f3f6, metalness: 0.3, roughness: 0.5 }),
      sCount,
    );
    const toZ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1));
    let used = 0;
    for (let k = 0; k < sCount; k++) {
      const i = Math.round(indexAtS(data, k * sStep)) % n;
      const p = P[i].clone().addScaledVector(ups[i], -gauge * 0.45);
      const h = p.z - groundZ;
      if (ups[i].z < 0.3 || h < gauge * 0.5) continue;
      m.compose(
        new THREE.Vector3(p.x, p.y, groundZ + h / 2),
        toZ,
        new THREE.Vector3(gauge * 0.09, h, gauge * 0.09),
      );
      supports.setMatrixAt(used++, m);
    }
    supports.count = used;
    supports.castShadow = true;
    this.group.add(supports);
  }

  recolor(mode: ColorMode) {
    if (!this.heat || !this.heatCurve || !this.data) return;
    const data = this.data;
    const geo = this.heat.geometry as THREE.TubeGeometry;
    const { tubularSegments, radialSegments } = geo.parameters;
    const colors = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i <= tubularSegments; i++) {
      const s = (i / tubularSegments) * data.summary.length;
      const c = heatColor(data, Math.round(indexAtS(data, s)), mode);
      for (let j = 0; j <= radialSegments; j++) c.toArray(colors, (i * (radialSegments + 1) + j) * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }
}
