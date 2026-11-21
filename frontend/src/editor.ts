import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { World } from "./scene";

const RADIO_CLIC = 25; // pixeles: si haces clic a menos de esto de un punto, lo agarras

/**
 * Editor para dibujar la pista:
 *  - clic en el suelo        -> pone un punto nuevo
 *  - clic cerca de un punto  -> lo selecciona (amarillo)
 *  - arrastrar un punto      -> lo mueve por encima del suelo (x, y)
 *  - flecha azul o slider    -> cambia la altura z del punto seleccionado
 *  - Supr                    -> borra el punto seleccionado
 */
export class Editor {
  readonly group = new THREE.Group();
  private points: THREE.Mesh[] = [];
  private selected: THREE.Mesh | null = null;
  private transform: TransformControls;
  private line: THREE.Line;
  private raycaster = new THREE.Raycaster();
  private down = new THREE.Vector2();
  private geo = new THREE.SphereGeometry(0.9, 20, 14);
  // arrastre con el mouse
  private arrastrando: THREE.Mesh | null = null;
  private seMovio = false;
  private agarroPunto = false;
  height = 10;
  enabled = true;
  closed = true;
  onChange: (final: boolean) => void = () => {};
  onSelect: (punto: { indice: number; z: number } | null) => void = () => {};

  constructor(private world: World) {
    world.scene.add(this.group);
    this.transform = new TransformControls(world.camera, world.renderer.domElement);
    this.transform.setSize(0.9);
    world.scene.add(this.transform.getHelper());
    this.transform.addEventListener("dragging-changed", (e) => {
      world.controls.enabled = !e.value;
      if (!e.value) {
        this.avisarSeleccion();
        this.onChange(true);
      }
    });
    this.transform.addEventListener("objectChange", () => {
      if (this.selected && this.selected.position.z < 0.5) this.selected.position.z = 0.5;
      this.updateLine();
      this.onChange(false);
    });

    this.line = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 1, gapSize: 0.7, transparent: true, opacity: 0.55 }),
    );
    this.group.add(this.line);

    const dom = world.renderer.domElement;
    // "capture" para enterarnos antes que la camara (OrbitControls) y no rotar mientras movemos un punto
    dom.addEventListener("pointerdown", (e) => this.alPresionar(e), { capture: true });
    dom.addEventListener("pointermove", (e) => this.alMover(e));
    dom.addEventListener("pointerup", (e) => this.alSoltar(e));
  }

  // ---------- mouse ----------
  private alPresionar(e: PointerEvent) {
    this.down.set(e.clientX, e.clientY);
    this.agarroPunto = false;
    if (!this.enabled || e.button !== 0) return;
    if (this.transform.axis !== null) return; // esta usando las flechas del gizmo
    const punto = this.puntoCerca(e.clientX, e.clientY);
    if (!punto) return;
    this.agarroPunto = true;
    this.select(punto);
    this.arrastrando = punto;
    this.seMovio = false;
    this.world.controls.enabled = false;
    this.world.renderer.domElement.setPointerCapture(e.pointerId);
    e.stopImmediatePropagation(); // que la camara no se mueva
  }

  private alMover(e: PointerEvent) {
    const dom = this.world.renderer.domElement;
    if (this.arrastrando) {
      if (this.down.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) < 3 && !this.seMovio) return;
      const p = this.sobrePlano(e.clientX, e.clientY, this.arrastrando.position.z);
      if (!p) return;
      this.arrastrando.position.x = Math.round(p.x * 2) / 2;
      this.arrastrando.position.y = Math.round(p.y * 2) / 2;
      this.seMovio = true;
      this.updateLine();
      this.onChange(false);
      return;
    }
    if (this.enabled && !this.transform.dragging) {
      dom.style.cursor = this.puntoCerca(e.clientX, e.clientY) ? "grab" : "";
    }
  }

  private alSoltar(e: PointerEvent) {
    if (this.arrastrando) {
      this.arrastrando = null;
      this.world.controls.enabled = true;
      if (this.seMovio) this.onChange(true);
      return;
    }
    if (!this.enabled || e.button !== 0 || this.agarroPunto) return;
    if (this.down.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 5) return; // fue para girar la camara
    if (this.transform.dragging || this.transform.axis !== null) return;
    // clic en el suelo: punto nuevo (despues del seleccionado)
    const p = this.sobrePlano(e.clientX, e.clientY, 0);
    if (!p) return;
    const at = this.selected ? this.points.indexOf(this.selected) + 1 : this.points.length;
    this.insert(at, new THREE.Vector3(Math.round(p.x), Math.round(p.y), this.height));
    this.onChange(true);
  }

  /** El punto mas cercano al mouse en la pantalla (o null si ninguno esta cerca). */
  private puntoCerca(cx: number, cy: number): THREE.Mesh | null {
    const rect = this.world.renderer.domElement.getBoundingClientRect();
    let mejor: THREE.Mesh | null = null;
    let mejorDist = RADIO_CLIC;
    for (const m of this.points) {
      // tambien cuenta hacer clic en la etiqueta "P1", "P2"... que esta un poco arriba
      for (const dz of [0, 2.2]) {
        const s = m.position.clone().add(new THREE.Vector3(0, 0, dz)).project(this.world.camera);
        if (s.z > 1) continue; // esta detras de la camara
        const x = rect.left + ((s.x + 1) / 2) * rect.width;
        const y = rect.top + ((1 - s.y) / 2) * rect.height;
        const d = Math.hypot(x - cx, y - cy);
        if (d < mejorDist) {
          mejorDist = d;
          mejor = m;
        }
      }
    }
    return mejor;
  }

  /** Donde corta el rayo del mouse al plano horizontal z = altura. */
  private sobrePlano(cx: number, cy: number, altura: number): THREE.Vector3 | null {
    const rect = this.world.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.world.camera);
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -altura), p);
  }

  // ---------- puntos ----------
  private makePoint(v: THREE.Vector3) {
    const m = new THREE.Mesh(this.geo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x335577 }));
    m.position.copy(v);
    m.castShadow = true;
    const el = document.createElement("div");
    el.className = "point-label";
    const lab = new CSS2DObject(el);
    lab.position.set(0, 0, 2.2);
    m.add(lab);
    // linea vertical hasta el suelo para ver la altura
    const stem = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }),
    );
    stem.name = "stem";
    m.add(stem);
    return m;
  }

  private insert(at: number, v: THREE.Vector3) {
    const m = this.makePoint(v);
    this.points.splice(at, 0, m);
    this.group.add(m);
    this.select(m);
  }

  select(m: THREE.Mesh | null) {
    this.selected = m;
    if (m && this.enabled) this.transform.attach(m);
    else this.transform.detach();
    this.refresh();
    this.avisarSeleccion();
  }

  private avisarSeleccion() {
    const m = this.selected;
    this.onSelect(m ? { indice: this.points.indexOf(m), z: m.position.z } : null);
  }

  /** Cambia la altura del punto seleccionado (desde el slider). Devuelve false si no hay punto. */
  setSelectedHeight(z: number): boolean {
    if (!this.selected) return false;
    this.selected.position.z = z;
    this.updateLine();
    this.onChange(false);
    return true;
  }

  private dispose(m: THREE.Mesh) {
    // three no borra solas las etiquetas HTML, toca quitarlas a mano
    m.traverse((o) => {
      if (o instanceof CSS2DObject) o.element.remove();
    });
    this.group.remove(m);
    (m.material as THREE.Material).dispose();
  }

  removeSelected() {
    if (!this.selected) return;
    const i = this.points.indexOf(this.selected);
    this.dispose(this.selected);
    this.points.splice(i, 1);
    this.select(this.points[Math.max(0, i - 1)] ?? null);
    this.onChange(true);
  }

  clear() {
    for (const p of this.points) this.dispose(p);
    this.points = [];
    this.select(null);
  }

  setPoints(pts: number[][]) {
    this.clear();
    for (const p of pts) {
      const m = this.makePoint(new THREE.Vector3(p[0], p[1], p[2]));
      this.points.push(m);
      this.group.add(m);
    }
    this.refresh();
  }

  getPoints(): number[][] {
    return this.points.map((m) => [+m.position.x.toFixed(3), +m.position.y.toFixed(3), +m.position.z.toFixed(3)]);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.group.visible = on;
    for (const m of this.points) m.traverse((o) => o instanceof CSS2DObject && (o.visible = on));
    if (!on) this.transform.detach();
    else if (this.selected) this.transform.attach(this.selected);
  }

  private refresh() {
    this.points.forEach((m, i) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.color.set(m === this.selected ? 0xfde047 : i === 0 ? 0x4ade80 : 0xffffff);
      const lab = m.children.find((c) => c instanceof CSS2DObject) as CSS2DObject;
      lab.element.textContent = `P${i + 1}`;
      lab.element.classList.toggle("sel", m === this.selected);
    });
    this.updateLine();
  }

  private updateLine() {
    const pts = this.points.map((m) => m.position.clone());
    if (this.closed && pts.length > 2) pts.push(pts[0].clone());
    this.line.geometry.dispose();
    this.line.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    this.line.computeLineDistances();
    for (const m of this.points) {
      const stem = m.getObjectByName("stem") as THREE.Line;
      stem.scale.set(1, 1, m.position.z - this.world.groundZ);
    }
  }

  setClosed(c: boolean) {
    this.closed = c;
    this.updateLine();
  }
}
