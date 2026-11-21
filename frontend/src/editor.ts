import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { World } from "./scene";

/**
 * Editor para DIBUJAR la pista:
 *  - clic en el suelo  -> agrega un punto de control (a la altura elegida)
 *  - clic en un punto  -> lo selecciona; arrastra las flechas para moverlo en x, y, z
 *  - Supr              -> borra el punto seleccionado
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
  height = 10;
  enabled = true;
  onChange: (final: boolean) => void = () => {};

  constructor(private world: World) {
    world.scene.add(this.group);
    this.transform = new TransformControls(world.camera, world.renderer.domElement);
    this.transform.setSize(0.9);
    world.scene.add(this.transform.getHelper());
    this.transform.addEventListener("dragging-changed", (e) => {
      world.controls.enabled = !e.value;
      if (!e.value) this.onChange(true);
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
    dom.addEventListener("pointerdown", (e) => this.down.set(e.clientX, e.clientY));
    dom.addEventListener("pointerup", (e) => {
      if (!this.enabled || e.button !== 0) return;
      if (this.down.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 5) return;
      if (this.transform.dragging || this.transform.axis !== null) return;
      this.click(e);
    });
  }

  closed = true;

  private click(e: PointerEvent) {
    const rect = this.world.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.world.camera);
    const hit = this.raycaster.intersectObjects(this.points, false)[0];
    if (hit) {
      this.select(hit.object as THREE.Mesh);
      return;
    }
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const p = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(groundPlane, p)) return;
    const at = this.selected ? this.points.indexOf(this.selected) + 1 : this.points.length;
    this.insert(at, new THREE.Vector3(Math.round(p.x), Math.round(p.y), this.height));
    this.onChange(true);
  }

  private makePoint(v: THREE.Vector3) {
    const m = new THREE.Mesh(this.geo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x335577 }));
    m.position.copy(v);
    m.castShadow = true;
    const el = document.createElement("div");
    el.className = "point-label";
    const lab = new CSS2DObject(el);
    lab.position.set(0, 0, 2.2);
    m.add(lab);
    // Linea vertical hasta el suelo para leer la altura z.
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
  }

  /** Quita un punto de la escena (incluida su etiqueta HTML, que three no borra sola). */
  private dispose(m: THREE.Mesh) {
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
    // CSS2DRenderer no oculta las etiquetas de un grupo invisible: lo hacemos a mano.
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
