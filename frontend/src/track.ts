import * as THREE from "three";
import { indexOf, v3 } from "./frames";
import type { TrackData } from "./types";

export type ColorPor = "kappa" | "g";

/**
 * Color de cada tramo, de verde a rojo:
 *  - curvatura: rojo cuando el radio es menor a 10 (kappa > 0.1)
 *  - fuerza G:  verde en 1 G (peso normal), rojo desde 4 G
 */
export function colorTramo(data: TrackData, i: number, por: ColorPor) {
  const x = por === "kappa" ? Math.min(data.kappa[i] / 0.1, 1) : Math.min(Math.max((data.g[i] - 1) / 3, 0), 1);
  return new THREE.Color().setHSL(0.33 * (1 - x), 0.9, 0.5);
}

/** Dibuja la pista: dos rieles, un tubo del medio coloreado por kappa, travesanos y soportes. */
export class TrackView {
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  clear() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
    });
    this.group.clear();
  }

  build(data: TrackData, ups: THREE.Vector3[], ancho: number, sueloZ: number, por: ColorPor) {
    this.clear();
    const cerrada = data.summary.closed;
    const n = cerrada ? data.pos.length - 1 : data.pos.length;
    const P = data.pos.slice(0, n).map(v3);
    const T = data.T.map(v3);
    const lados = T.map((t, i) => ups[i].clone().cross(t).normalize());
    const segs = Math.min(n * 2, 2400);

    // rieles
    const metal = new THREE.MeshStandardMaterial({ color: 0xd9dee6, metalness: 0.8, roughness: 0.3 });
    for (const lado of [1, -1]) {
      const pts = P.map((p, i) => p.clone().addScaledVector(lados[i], (lado * ancho) / 2));
      const curva = new THREE.CatmullRomCurve3(pts, cerrada);
      const riel = new THREE.Mesh(new THREE.TubeGeometry(curva, segs, ancho * 0.07, 8, cerrada), metal);
      riel.castShadow = true;
      this.group.add(riel);
    }

    // tubo del medio con el color de la curvatura o de la fuerza G
    const medio = new THREE.CatmullRomCurve3(P.map((p, i) => p.clone().addScaledVector(ups[i], -ancho * 0.32)), cerrada);
    const geo = new THREE.TubeGeometry(medio, segs, ancho * 0.17, 10, cerrada);
    const colores = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i <= segs; i++) {
      const c = colorTramo(data, Math.round(indexOf(data.s, (i / segs) * data.summary.length)), por);
      for (let j = 0; j <= 10; j++) c.toArray(colores, (i * 11 + j) * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colores, 3));
    const tubo = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
    tubo.castShadow = true;
    this.group.add(tubo);

    // travesanos
    const m = new THREE.Matrix4();
    const paso = ancho * 1.4;
    const cuantos = Math.floor(data.summary.length / paso);
    const trav = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x3b4352 }), cuantos);
    const escala = new THREE.Matrix4().makeScale(ancho * 0.22, ancho * 1.25, ancho * 0.12);
    for (let k = 0; k < cuantos; k++) {
      const i = Math.round(indexOf(data.s, k * paso)) % n;
      m.makeBasis(T[i], lados[i], ups[i]).setPosition(P[i].clone().addScaledVector(ups[i], -ancho * 0.1));
      trav.setMatrixAt(k, m.clone().multiply(escala));
    }
    this.group.add(trav);

    // soportes hasta el suelo
    const paso2 = ancho * 7;
    const total = Math.floor(data.summary.length / paso2);
    const sop = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 8), new THREE.MeshStandardMaterial({ color: 0xf1f3f6 }), total);
    const vertical = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1));
    let usados = 0;
    for (let k = 0; k < total; k++) {
      const i = Math.round(indexOf(data.s, k * paso2)) % n;
      const p = P[i].clone().addScaledVector(ups[i], -ancho * 0.45);
      const alto = p.z - sueloZ;
      if (ups[i].z < 0.3 || alto < ancho * 0.5) continue;
      m.compose(new THREE.Vector3(p.x, p.y, sueloZ + alto / 2), vertical, new THREE.Vector3(ancho * 0.09, alto, ancho * 0.09));
      sop.setMatrixAt(usados++, m);
    }
    sop.count = usados;
    this.group.add(sop);
  }
}
