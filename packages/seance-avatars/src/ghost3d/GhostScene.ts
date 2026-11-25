/**
 * One WebGL canvas that shows one or more 3D ghosts over a glowing séance circle, with name tags,
 * floating sparks, neon rim lights and drag-to-orbit (look at the ghosts from any angle).
 *
 * Many ghosts share ONE canvas (browsers allow only a handful of WebGL contexts per page).
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Texture,
} from "three";
import { GhostModel, type GhostLook } from "./GhostModel.js";

export interface GhostSpec {
  readonly id: string;
  readonly name?: string;
  readonly look?: Partial<GhostLook>;
}

export interface GhostSceneOptions {
  /** Drag to orbit the camera (default true). */
  readonly interactive?: boolean;
  /** Slowly circle the ghosts when nobody is dragging (default true). */
  readonly autoRotate?: boolean;
  readonly reducedMotion?: boolean;
  /** Show name tags above ghosts (default true when a name is given). */
  readonly showNames?: boolean;
}

const SPACING = 2.45;
const ROW_SIZE = 5;
const FLOOR_Y = -1.32;

function circleTexture(): CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const mid = size / 2;
  const glow = (color: string, blur: number) => {
    g.strokeStyle = color;
    g.shadowColor = color;
    g.shadowBlur = blur;
  };
  const grad = g.createRadialGradient(mid, mid, 0, mid, mid, mid);
  grad.addColorStop(0, "rgba(255,0,255,0.28)");
  grad.addColorStop(0.55, "rgba(0,255,255,0.08)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  g.lineWidth = 6;
  glow("#00ffff", 24);
  g.beginPath();
  g.arc(mid, mid, mid * 0.86, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3;
  glow("#ff00ff", 18);
  g.beginPath();
  g.arc(mid, mid, mid * 0.74, 0, Math.PI * 2);
  g.stroke();
  // Five-pointed star joining points on the inner ring.
  g.beginPath();
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * (Math.PI * 2)) / 5;
    const x = mid + Math.cos(a) * mid * 0.74;
    const y = mid + Math.sin(a) * mid * 0.74;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  // Rune ticks between the rings.
  glow("#ffff66", 10);
  g.lineWidth = 3;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r1 = mid * 0.77;
    const r2 = mid * (i % 3 === 0 ? 0.84 : 0.81);
    g.beginPath();
    g.moveTo(mid + Math.cos(a) * r1, mid + Math.sin(a) * r1);
    g.lineTo(mid + Math.cos(a) * r2, mid + Math.sin(a) * r2);
    g.stroke();
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function dotTexture(soft = true): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(soft ? 0.25 : 0.5, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

interface Slot {
  model: GhostModel;
  circle: Mesh;
  shadow: Mesh;
  tag: HTMLDivElement | null;
  name: string | undefined;
}

/** True when this browser can create a WebGL context. */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

export class GhostScene {
  private readonly _container: HTMLElement;
  private readonly _renderer: WebGLRenderer;
  private readonly _scene = new Scene();
  private readonly _camera = new PerspectiveCamera(32, 1, 0.1, 100);
  private readonly _world = new Group();
  private readonly _overlay: HTMLDivElement;
  private readonly _slots = new Map<string, Slot>();
  private readonly _circleTex: Texture;
  private readonly _dotTex: Texture;
  private readonly _circleGeo = new PlaneGeometry(2.7, 2.7);
  private readonly _shadowGeo = new PlaneGeometry(1.6, 1.6);
  private readonly _sparks: Points;
  private readonly _sparkVel: Float32Array;
  private readonly _opts: Required<GhostSceneOptions>;
  private readonly _target = new Vector3(0, -0.1, 0);
  private _az = 0;
  private _el = 0.14;
  private _dist = 7;
  private _fitDist = 7;
  private _dragging = false;
  private _lastX = 0;
  private _lastY = 0;
  private _idleSince = 0;
  private _raf = 0;
  private _running = false;
  private _visible = true;
  private _t = 0;
  private _last = 0;
  private _disposed = false;
  private readonly _resizeObs: ResizeObserver;
  private readonly _ioObs: IntersectionObserver | undefined;
  private readonly _cleanups: (() => void)[] = [];

  constructor(container: HTMLElement, options: GhostSceneOptions = {}) {
    this._container = container;
    this._opts = {
      interactive: options.interactive ?? true,
      autoRotate: options.autoRotate ?? true,
      reducedMotion: options.reducedMotion ?? false,
      showNames: options.showNames ?? true,
    };

    this._renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this._renderer.toneMapping = ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.15;
    this._renderer.setClearColor(0x000000, 0);
    const canvas = this._renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = this._opts.interactive ? "none" : "auto";
    canvas.style.cursor = this._opts.interactive ? "grab" : "default";
    container.style.position = container.style.position || "relative";
    container.appendChild(canvas);

    this._overlay = document.createElement("div");
    Object.assign(this._overlay.style, { position: "absolute", inset: "0", pointerEvents: "none", overflow: "hidden" });
    container.appendChild(this._overlay);

    // Lights: soft fill, white key, cyan + magenta neon rims from behind.
    this._scene.add(new AmbientLight(0x3a1a5a, 0.9));
    this._scene.add(new HemisphereLight(0xaaffff, 0x5a0a5a, 0.9));
    const key = new DirectionalLight(0xffffff, 2.0);
    key.position.set(2.5, 4, 5);
    this._scene.add(key);
    const rimC = new PointLight(0x00ffff, 30, 14, 2);
    rimC.position.set(-3.2, 1.6, -2.4);
    this._scene.add(rimC);
    const rimM = new PointLight(0xff00ff, 30, 14, 2);
    rimM.position.set(3.2, 0.4, -2.4);
    this._scene.add(rimM);
    const under = new PointLight(0xff00ff, 6, 5, 2);
    under.position.set(0, FLOOR_Y + 0.2, 1.2);
    this._scene.add(under);
    this._scene.add(this._world);

    this._circleTex = circleTexture();
    this._dotTex = dotTexture();

    // Floating sparks (cyan / magenta / yellow).
    const n = 140;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    this._sparkVel = new Float32Array(n);
    const palette = [new Color(0x00ffff), new Color(0xff00ff), new Color(0xffff66)];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 9;
      pos[i * 3 + 1] = FLOOR_Y + Math.random() * 3.6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5 - 0.5;
      const c = palette[i % 3]!;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      this._sparkVel[i] = 0.12 + Math.random() * 0.3;
    }
    const sparkGeo = new BufferGeometry();
    sparkGeo.setAttribute("position", new BufferAttribute(pos, 3));
    sparkGeo.setAttribute("color", new BufferAttribute(col, 3));
    this._sparks = new Points(
      sparkGeo,
      new PointsMaterial({ size: 0.07, map: this._dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.85 }),
    );
    this._scene.add(this._sparks);

    this._resizeObs = new ResizeObserver(() => this._resize());
    this._resizeObs.observe(container);
    if (typeof IntersectionObserver !== "undefined") {
      this._ioObs = new IntersectionObserver((entries) => {
        this._visible = entries.some((e) => e.isIntersecting);
        this._syncRunning();
      });
      this._ioObs.observe(container);
    }
    const onVis = () => this._syncRunning();
    document.addEventListener("visibilitychange", onVis);
    this._cleanups.push(() => document.removeEventListener("visibilitychange", onVis));
    const onLost = (e: Event) => {
      e.preventDefault();
      this._stop();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    this._cleanups.push(() => canvas.removeEventListener("webglcontextlost", onLost));
    if (this._opts.interactive) this._bindDrag(canvas);

    this._resize();
    this._syncRunning();
  }

  /** Replace the set of ghosts (keeps existing ones by id, so they don't flicker). */
  setGhosts(specs: readonly GhostSpec[]): void {
    const keep = new Set(specs.map((s) => s.id));
    for (const [id, slot] of this._slots) {
      if (!keep.has(id)) this._removeSlot(id, slot);
    }
    specs.forEach((spec) => {
      let slot = this._slots.get(spec.id);
      if (!slot) {
        slot = this._addSlot();
        this._slots.set(spec.id, slot);
      }
      if (spec.look) slot.model.setLook(spec.look);
      this._setName(slot, spec.name);
    });
    // Re-order to match the given order, then lay out in rows.
    const ordered = specs.map((s) => this._slots.get(s.id)!);
    const rows = Math.ceil(ordered.length / ROW_SIZE) || 1;
    ordered.forEach((slot, i) => {
      const row = Math.floor(i / ROW_SIZE);
      const inRow = Math.min(ROW_SIZE, ordered.length - row * ROW_SIZE);
      const col = i % ROW_SIZE;
      const x = (col - (inRow - 1) / 2) * SPACING + (row % 2) * (SPACING / 2) * (inRow < ROW_SIZE ? 0 : 1);
      const z = -row * 1.9;
      slot.model.root.position.set(x, row * 0.25, z);
      slot.circle.position.set(x, FLOOR_Y + row * 0.25, z);
      slot.shadow.position.set(x, FLOOR_Y + 0.005 + row * 0.25, z);
    });
    const widest = Math.min(ROW_SIZE, ordered.length);
    this._target.set(0, -0.1 + (rows - 1) * 0.1, -(rows - 1) * 0.95);
    this._fitWidth = Math.max(1, widest) * SPACING + 0.6;
    this._fitHeight = 3.3 + (rows - 1) * 0.9;
    this._fit();
  }

  /** Update one ghost's look (mouth, glow, colour, orientation…). */
  update(id: string, look: Partial<GhostLook>): void {
    this._slots.get(id)?.model.setLook(look);
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._stop();
    this._resizeObs.disconnect();
    this._ioObs?.disconnect();
    for (const c of this._cleanups) c();
    for (const [id, slot] of this._slots) this._removeSlot(id, slot);
    this._circleGeo.dispose();
    this._shadowGeo.dispose();
    this._circleTex.dispose();
    this._dotTex.dispose();
    this._sparks.geometry.dispose();
    (this._sparks.material as PointsMaterial).dispose();
    this._renderer.dispose();
    this._renderer.forceContextLoss();
    this._renderer.domElement.remove();
    this._overlay.remove();
  }

  // ---------------------------------------------------------------------------------------------

  private _fitWidth = SPACING + 0.6;
  private _fitHeight = 3.3;

  private _addSlot(): Slot {
    const model = new GhostModel();
    this._world.add(model.root);
    const circle = new Mesh(
      this._circleGeo,
      new MeshBasicMaterial({ map: this._circleTex, transparent: true, depthWrite: false, blending: AdditiveBlending }),
    );
    circle.rotation.x = -Math.PI / 2;
    this._world.add(circle);
    const shadow = new Mesh(
      this._shadowGeo,
      new MeshBasicMaterial({ map: this._dotTex, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    this._world.add(shadow);
    return { model, circle, shadow, tag: null, name: undefined };
  }

  private _removeSlot(id: string, slot: Slot): void {
    slot.model.dispose();
    (slot.circle.material as MeshBasicMaterial).dispose();
    (slot.shadow.material as MeshBasicMaterial).dispose();
    slot.circle.removeFromParent();
    slot.shadow.removeFromParent();
    slot.tag?.remove();
    this._slots.delete(id);
  }

  private _setName(slot: Slot, name: string | undefined): void {
    if (!this._opts.showNames || !name) {
      slot.tag?.remove();
      slot.tag = null;
      slot.name = undefined;
      return;
    }
    if (!slot.tag) {
      slot.tag = document.createElement("div");
      Object.assign(slot.tag.style, {
        position: "absolute",
        left: "0",
        top: "0",
        transform: "translate(-50%, -100%)",
        padding: "4px 10px",
        whiteSpace: "nowrap",
        fontFamily: "var(--sx-font-display, sans-serif)",
        fontSize: "13px",
        letterSpacing: "1px",
        color: "#fff",
        background: "rgba(16, 6, 30, 0.82)",
        border: "1px solid rgba(0, 255, 255, 0.6)",
        boxShadow: "0 0 10px rgba(0, 255, 255, 0.45)",
        textShadow: "0 0 6px rgba(0, 255, 255, 0.8)",
        willChange: "transform",
      } satisfies Partial<CSSStyleDeclaration>);
      this._overlay.appendChild(slot.tag);
    }
    if (slot.name !== name) {
      slot.tag.textContent = name; // textContent: names are user input, never HTML
      slot.name = name;
    }
  }

  private _bindDrag(canvas: HTMLCanvasElement): void {
    const down = (e: PointerEvent) => {
      this._dragging = true;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (!this._dragging) return;
      this._az -= (e.clientX - this._lastX) * 0.009;
      this._el = Math.min(1.0, Math.max(-0.45, this._el + (e.clientY - this._lastY) * 0.006));
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this._idleSince = this._t;
    };
    const up = () => {
      this._dragging = false;
      this._idleSince = this._t;
      canvas.style.cursor = "grab";
    };
    const reset = () => {
      this._az = 0;
      this._el = 0.14;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("dblclick", reset);
    this._cleanups.push(() => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("dblclick", reset);
    });
  }

  private _resize(): void {
    const w = Math.max(1, this._container.clientWidth);
    const h = Math.max(1, this._container.clientHeight);
    this._renderer.setSize(w, h, false);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    this._fit();
    if (!this._running) this._render(0);
  }

  /** Camera distance that keeps every ghost (and its circle) in view. */
  private _fit(): void {
    const vfov = (this._camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this._camera.aspect);
    const byH = this._fitHeight / 2 / Math.tan(vfov / 2);
    const byW = this._fitWidth / 2 / Math.tan(hfov / 2);
    this._fitDist = Math.max(byH, byW) + 1.4;
    this._dist = this._fitDist;
  }

  private _syncRunning(): void {
    const shouldRun = this._visible && document.visibilityState !== "hidden" && !this._disposed;
    if (shouldRun && !this._running) this._start();
    else if (!shouldRun && this._running) this._stop();
  }

  private _start(): void {
    this._running = true;
    this._last = performance.now();
    const tick = (now: number) => {
      if (!this._running) return;
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      this._render(dt);
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  private _stop(): void {
    this._running = false;
    cancelAnimationFrame(this._raf);
  }

  private _render(dt: number): void {
    this._t += dt;
    const t = this._t;
    const reduced = this._opts.reducedMotion;

    if (this._opts.autoRotate && !reduced && !this._dragging && t - this._idleSince > 2.5) {
      this._az += dt * 0.28;
    }
    const cosEl = Math.cos(this._el);
    this._camera.position.set(
      this._target.x + Math.sin(this._az) * cosEl * this._dist,
      this._target.y + Math.sin(this._el) * this._dist + 0.3,
      this._target.z + Math.cos(this._az) * cosEl * this._dist,
    );
    this._camera.lookAt(this._target);

    for (const slot of this._slots.values()) {
      slot.model.update(t, dt, reduced);
      slot.circle.rotation.z = t * 0.15;
      const s = 1 + Math.sin(t * 2 + slot.model.root.position.x) * 0.03;
      slot.circle.scale.setScalar(s);
    }

    // Sparks drift upwards and wrap around.
    const pos = this._sparks.geometry.attributes["position"] as BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < this._sparkVel.length; i++) {
      arr[i * 3 + 1]! += this._sparkVel[i]! * dt * (reduced ? 0.3 : 1);
      arr[i * 3]! += Math.sin(t + i) * dt * 0.05;
      if (arr[i * 3 + 1]! > FLOOR_Y + 3.8) arr[i * 3 + 1] = FLOOR_Y;
    }
    pos.needsUpdate = true;

    this._renderer.render(this._scene, this._camera);
    this._placeTags();
  }

  private _placeTags(): void {
    const w = this._container.clientWidth;
    const h = this._container.clientHeight;
    const v = new Vector3();
    for (const slot of this._slots.values()) {
      if (!slot.tag) continue;
      v.copy(slot.model.tagAnchor);
      slot.model.root.localToWorld(v);
      v.project(this._camera);
      const behind = v.z > 1;
      slot.tag.style.display = behind ? "none" : "block";
      slot.tag.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
    }
  }
}
