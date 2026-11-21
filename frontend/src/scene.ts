import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";

// Igual que en el curso: el eje z apunta hacia arriba.
THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

export class World {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.05, 5000);
  readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  readonly labels = new CSS2DRenderer();
  readonly controls: OrbitControls;
  groundZ = 0;
  private ground: THREE.Mesh;
  private grid: THREE.GridHelper;
  private sun: THREE.DirectionalLight;
  private callbacks: ((dt: number) => void)[] = [];
  private clock = new THREE.Clock();

  constructor(private container: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.labels.domElement.className = "labels-layer";
    container.appendChild(this.labels.domElement);

    this.camera.position.set(-60, -70, 55);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(25, 20, 8);

    this.scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x3d5a3a, 1.1));
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(this.sun, this.sun.target);

    this.ground = new THREE.Mesh(
      new THREE.CircleGeometry(1, 96),
      new THREE.MeshStandardMaterial({ color: 0x5f8f55, roughness: 1 }),
    );
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    this.grid = new THREE.GridHelper(1, 1);
    this.scene.add(this.grid);
    this.setGround(0, new THREE.Vector3(25, 20, 0), 80);

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  /** Coloca el suelo, la cuadricula y el sol segun el tamano de la pista. */
  setGround(z: number, center: THREE.Vector3, size: number) {
    this.groundZ = z;
    const r = Math.max(size * 3, 150);
    this.ground.scale.setScalar(r);
    this.ground.position.set(center.x, center.y, z - 0.02);

    this.scene.remove(this.grid);
    this.grid.geometry.dispose();
    const step = size > 60 ? 10 : size > 15 ? 5 : 1;
    const span = Math.ceil((size * 2.2) / step) * step;
    this.grid = new THREE.GridHelper(span, span / step, 0x9cc79a, 0x7aa978);
    this.grid.rotation.x = Math.PI / 2;
    this.grid.position.set(Math.round(center.x / step) * step, Math.round(center.y / step) * step, z);
    (this.grid.material as THREE.Material).transparent = true;
    (this.grid.material as THREE.Material).opacity = 0.45;
    this.scene.add(this.grid);

    this.sun.position.set(center.x - size, center.y - size * 0.6, z + size * 1.5);
    this.sun.target.position.copy(center);
    const cam = this.sun.shadow.camera;
    cam.left = cam.bottom = -size * 1.2;
    cam.right = cam.top = size * 1.2;
    cam.near = 1;
    cam.far = size * 5;
    cam.updateProjectionMatrix();
  }

  /** Encuadra la camara para ver toda la caja dada. */
  frame(box: THREE.Box3) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    this.controls.target.copy(center);
    this.camera.position.copy(center).add(new THREE.Vector3(-0.55, -0.75, 0.55).multiplyScalar(size * 0.95 + 4));
    this.controls.update();
  }

  onFrame(cb: (dt: number) => void) {
    this.callbacks.push(cb);
  }

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labels.setSize(w, h);
  }

  private tick() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    for (const cb of this.callbacks) cb(dt);
    if (this.controls.enabled) this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }
}
