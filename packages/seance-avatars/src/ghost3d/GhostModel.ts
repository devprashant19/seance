/**
 * A procedural 3D ghost: lathe-turned body with a rippling hem, glossy eyes, a mouth that opens
 * when singing, waving arms, and a neon fresnel halo. Built from code (no downloaded model), so it
 * is license-free, tiny, and recolourable per player.
 */
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  CanvasTexture,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Material,
  type Texture,
} from "three";

/** How long the dizzy reaction lasts (seconds). */
export const DIZZY_SECONDS = 3;

function spiralTexture(): CanvasTexture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const mid = size / 2;
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.arc(mid, mid, mid - 2, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#14062a";
  g.lineWidth = 9;
  g.lineCap = "round";
  g.beginPath();
  for (let a = 0; a < Math.PI * 6; a += 0.1) {
    const r = (a / (Math.PI * 6)) * (mid - 10);
    const x = mid + Math.cos(a) * r;
    const y = mid + Math.sin(a) * r;
    if (a === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  return new CanvasTexture(c);
}

function starTexture(): CanvasTexture {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const mid = size / 2;
  g.fillStyle = "#ffffff";
  g.shadowColor = "#ffff66";
  g.shadowBlur = 10;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? mid - 8 : (mid - 8) * 0.42;
    const x = mid + Math.cos(a) * r;
    const y = mid + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  return new CanvasTexture(c);
}

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

const HEAD_RADIUS = 0.62;
const HEAD_CENTER_Y = 0.45;
const LATHE_SEGMENTS = 56;

/** Silhouette (radius, height) from the crown down to the hem. */
function profile(): Vector2[] {
  const pts: Vector2[] = [];
  const headSteps = 14;
  for (let i = 0; i <= headSteps; i++) {
    const a = (i / headSteps) * (Math.PI / 2);
    pts.push(new Vector2(Math.max(0.0001, HEAD_RADIUS * Math.sin(a)), HEAD_CENTER_Y + HEAD_RADIUS * Math.cos(a)));
  }
  const body: [number, number][] = [
    [0.63, 0.3], [0.645, 0.1], [0.66, -0.1], [0.675, -0.3], [0.695, -0.48],
    [0.72, -0.64], [0.745, -0.78], [0.765, -0.88], [0.78, -0.96], [0.785, -1.0],
  ];
  for (const [r, y] of body) pts.push(new Vector2(r, y));
  return pts;
}

const haloVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const haloFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.0);
    gl_FragColor = vec4(uColor * uIntensity, f * clamp(uIntensity, 0.0, 1.5));
  }
`;

export interface GhostLook {
  /** Neon tint (CSS colour). */
  color: string;
  /** 0 = closed, 1 = wide open (singing). */
  mouth: number;
  /** Extra glow, 0..1 (e.g. loudness). */
  glow: number;
  /** Silenced: dim, eyes half closed. */
  muted: boolean;
  /** Shake jitter 0..1. */
  shake: number;
  /** Target orientation (e.g. the phone's); null = idle sway. */
  quaternion: Quaternion | null;
  /** Bump this number to make the ghost dizzy (wobble, spiral eyes, topple; ~3 s). */
  dizzy: number;
}

export const DEFAULT_LOOK: GhostLook = { color: "#00ffff", mouth: 0, glow: 0, muted: false, shake: 0, quaternion: null, dizzy: 0 };

export class GhostModel {
  /** Position this in the scene. */
  readonly root = new Group();
  /** Point above the head (local to root) where a name tag goes. */
  readonly tagAnchor = new Vector3(0, 1.35, 0);

  private readonly _pose = new Group();
  private readonly _bob = new Group();
  private readonly _geometry: LatheGeometry;
  private readonly _base: Float32Array;
  private readonly _bodyMat: MeshPhysicalMaterial;
  private readonly _haloMat: ShaderMaterial;
  private readonly _cheekMat: MeshBasicMaterial;
  private readonly _mouth: Mesh;
  private readonly _eyes: Mesh[] = [];
  private readonly _shines: Mesh[] = [];
  private readonly _arms: Group[] = [];
  private readonly _phase = Math.random() * Math.PI * 2;
  private readonly _disposables: (BufferGeometry | Material)[] = [];
  private _look: GhostLook = { ...DEFAULT_LOOK };
  private _mouthNow = 0;
  private _glowNow = 0;
  private _blink = 0;
  private _frame = 0;
  private _dizzyCount = 0;
  /** Seconds into the dizzy reaction; < 0 when not dizzy. */
  private _dizzyT = -1;
  private _dizzySide = 1;
  private readonly _spiralEyes: Group[] = [];
  private readonly _stars: Sprite[] = [];
  private readonly _textures: Texture[] = [];

  constructor(look: Partial<GhostLook> = {}) {
    this.root.add(this._pose);
    this._pose.add(this._bob);

    this._geometry = new LatheGeometry(profile(), LATHE_SEGMENTS);
    this._base = Float32Array.from(this._geometry.attributes["position"]!.array as Float32Array);
    this._disposables.push(this._geometry);

    this._bodyMat = new MeshPhysicalMaterial({
      color: 0xf4f0ff,
      emissive: 0x000000,
      emissiveIntensity: 0.3,
      roughness: 0.42,
      metalness: 0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.35,
      sheen: 1,
      sheenRoughness: 0.5,
      side: DoubleSide,
    });
    this._disposables.push(this._bodyMat);
    const body = new Mesh(this._geometry, this._bodyMat);
    this._bob.add(body);

    // Neon halo: the same (animated) geometry, slightly larger, back faces, additive fresnel.
    this._haloMat = new ShaderMaterial({
      uniforms: { uColor: { value: new Color(0x00ffff) }, uIntensity: { value: 1 } },
      vertexShader: haloVertex,
      fragmentShader: haloFragment,
      side: BackSide,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this._disposables.push(this._haloMat);
    const halo = new Mesh(this._geometry, this._haloMat);
    halo.scale.setScalar(1.1);
    halo.position.y = -0.02;
    this._bob.add(halo);

    // Face, placed on the head sphere and facing outwards.
    const face = new Group();
    this._bob.add(face);
    const headCenter = new Vector3(0, HEAD_CENTER_Y, 0);
    const onHead = (dir: Vector3, inset: number) => headCenter.clone().add(dir.clone().normalize().multiplyScalar(HEAD_RADIUS - inset));

    const eyeGeo = new SphereGeometry(0.1, 24, 16);
    const eyeMat = new MeshStandardMaterial({ color: 0x14062a, roughness: 0.15, metalness: 0.2 });
    const shineGeo = new SphereGeometry(0.026, 12, 8);
    const shineMat = new MeshBasicMaterial({ color: 0xffffff });
    this._disposables.push(eyeGeo, eyeMat, shineGeo, shineMat);
    for (const side of [-1, 1]) {
      const dir = new Vector3(0.33 * side, 0.2, 0.92);
      const eye = new Mesh(eyeGeo, eyeMat);
      eye.position.copy(onHead(dir, 0.035));
      eye.lookAt(eye.position.clone().add(dir));
      eye.scale.set(0.8, 1.15, 0.55);
      face.add(eye);
      this._eyes.push(eye);
      const shine = new Mesh(shineGeo, shineMat);
      shine.position.copy(onHead(dir, -0.02)).add(new Vector3(-0.028, 0.04, 0));
      face.add(shine);
      this._shines.push(shine);
    }

    // Dizzy extras (hidden until shaken): spiral eyes and orbiting stars.
    const spiralTex = spiralTexture();
    const starTex = starTexture();
    this._textures.push(spiralTex, starTex);
    const spiralGeo = new CircleGeometry(0.115, 32);
    const spiralMat = new MeshBasicMaterial({ map: spiralTex, transparent: true });
    this._disposables.push(spiralGeo, spiralMat);
    for (const side of [-1, 1]) {
      const dir = new Vector3(0.33 * side, 0.2, 0.92);
      const holder = new Group();
      holder.position.copy(onHead(dir, -0.012));
      holder.lookAt(holder.position.clone().add(dir));
      holder.add(new Mesh(spiralGeo, spiralMat));
      holder.visible = false;
      face.add(holder);
      this._spiralEyes.push(holder);
    }
    for (let i = 0; i < 3; i++) {
      const mat = new SpriteMaterial({ map: starTex, color: 0xffff66, transparent: true, depthWrite: false, blending: AdditiveBlending });
      this._disposables.push(mat);
      const star = new Sprite(mat);
      star.scale.setScalar(0.22);
      star.visible = false;
      this._bob.add(star);
      this._stars.push(star);
    }

    const mouthGeo = new SphereGeometry(0.085, 24, 16);
    const mouthMat = new MeshStandardMaterial({ color: 0x2a0838, roughness: 0.5 });
    this._disposables.push(mouthGeo, mouthMat);
    this._mouth = new Mesh(mouthGeo, mouthMat);
    const mouthDir = new Vector3(0, -0.14, 1);
    this._mouth.position.copy(onHead(mouthDir, 0.03));
    this._mouth.lookAt(this._mouth.position.clone().add(mouthDir));
    face.add(this._mouth);

    const cheekGeo = new CircleGeometry(0.075, 24);
    this._cheekMat = new MeshBasicMaterial({ color: 0xff66cc, transparent: true, opacity: 0.5, depthWrite: false });
    this._disposables.push(cheekGeo, this._cheekMat);
    for (const side of [-1, 1]) {
      const dir = new Vector3(0.52 * side, -0.06, 0.85);
      const cheek = new Mesh(cheekGeo, this._cheekMat);
      cheek.position.copy(onHead(dir, -0.004));
      cheek.lookAt(cheek.position.clone().add(dir));
      face.add(cheek);
    }

    // Little arms that wave.
    const armGeo = new CapsuleGeometry(0.1, 0.24, 6, 14);
    this._disposables.push(armGeo);
    for (const side of [-1, 1]) {
      const pivot = new Group();
      pivot.position.set(0.6 * side, 0.12, 0.02);
      const arm = new Mesh(armGeo, this._bodyMat);
      arm.position.y = -0.2;
      pivot.add(arm);
      this._bob.add(pivot);
      this._arms.push(pivot);
    }

    this.setLook(look);
  }

  setLook(look: Partial<GhostLook>): void {
    this._look = { ...this._look, ...look };
    if (look.dizzy !== undefined && look.dizzy !== this._dizzyCount) {
      this._dizzyCount = look.dizzy;
      if (look.dizzy > 0) this.makeDizzy();
    }
    const tint = new Color(this._look.color);
    const muted = this._look.muted;
    this._bodyMat.color.copy(new Color(0xf4f0ff).lerp(tint, muted ? 0.05 : 0.14));
    if (muted) this._bodyMat.color.multiplyScalar(0.55);
    this._bodyMat.emissive.copy(tint);
    this._bodyMat.emissiveIntensity = muted ? 0.04 : 0.22;
    this._bodyMat.sheenColor.copy(tint);
    (this._haloMat.uniforms["uColor"]!.value as Color).copy(tint);
    this._cheekMat.opacity = muted ? 0.15 : 0.5;
  }

  /** Start (or restart) the dizzy reaction: wobble, spiral eyes, orbiting stars, topple, recover. */
  makeDizzy(): void {
    this._dizzyT = 0;
    this._dizzySide = Math.random() < 0.5 ? -1 : 1;
  }

  get isDizzy(): boolean {
    return this._dizzyT >= 0;
  }

  /** Advance the animation. `t` seconds since start, `dt` seconds since last frame. */
  update(t: number, dt: number, reducedMotion: boolean): void {
    const look = this._look;
    const motion = reducedMotion ? 0.35 : 1;
    const k = 1 - Math.exp(-dt * 12);
    this._mouthNow += (look.mouth - this._mouthNow) * k;
    this._glowNow += (look.glow - this._glowNow) * (1 - Math.exp(-dt * 6));

    // Hem ripples: rebuild positions from the rest shape every frame.
    const pos = this._geometry.attributes["position"] as BufferAttribute;
    const arr = pos.array as Float32Array;
    const base = this._base;
    const p = this._phase;
    const swayX = Math.sin(t * 1.1 + p) * 0.07 * motion;
    const swayZ = Math.cos(t * 0.9 + p) * 0.05 * motion;
    for (let i = 0; i < arr.length; i += 3) {
      const x = base[i]!;
      const y = base[i + 1]!;
      const z = base[i + 2]!;
      const w = Math.min(1, Math.max(0, (-0.1 - y) / 0.9)) ** 1.6;
      if (w <= 0) {
        arr[i] = x;
        arr[i + 1] = y;
        arr[i + 2] = z;
        continue;
      }
      const th = Math.atan2(z, x);
      const ripple = (Math.sin(5 * th + t * 2.6 + p) * 0.085 + Math.sin(9 * th - t * 1.7) * 0.028) * w * motion;
      const flare = 1 + w * (0.05 * Math.sin(3 * th - t * 1.3 + p) * motion + 0.04);
      arr[i] = x * flare - swayX * w;
      arr[i + 1] = y + ripple;
      arr[i + 2] = z * flare - swayZ * w;
    }
    pos.needsUpdate = true;
    if ((this._frame++ & 1) === 0) this._geometry.computeVertexNormals();

    // Float, sway and (optionally) follow a target orientation.
    this._bob.position.y = Math.sin(t * 1.6 + p) * 0.09 * motion + this._mouthNow * 0.04;
    this._bob.rotation.z = Math.sin(t * 0.8 + p) * 0.05 * motion;
    if (look.shake > 0.01) {
      const j = Math.min(1, look.shake) * 0.06;
      this._bob.position.x = (Math.random() - 0.5) * j;
      this._bob.position.z = (Math.random() - 0.5) * j;
    } else {
      this._bob.position.x = 0;
      this._bob.position.z = 0;
    }
    if (look.quaternion) {
      this._pose.quaternion.slerp(look.quaternion, 1 - Math.exp(-dt * 10));
    } else {
      this._pose.quaternion.slerp(new Quaternion(), 1 - Math.exp(-dt * 3));
    }

    // Arms wave (faster when singing).
    const wave = 2.2 + this._mouthNow * 4;
    this._arms.forEach((arm, idx) => {
      const side = idx === 0 ? -1 : 1;
      arm.rotation.z = side * (0.95 + Math.sin(t * wave + p + idx * 1.3) * 0.28 * motion);
      arm.rotation.x = Math.sin(t * 1.3 + idx) * 0.15 * motion;
    });

    // Mouth and eyes.
    const open = look.muted ? 0.12 : 0.22 + this._mouthNow * 0.95;
    this._mouth.scale.set(1 + this._mouthNow * 0.15, open, 0.45);
    this._blink -= dt;
    if (this._blink < -3.5 - Math.random() * 2) this._blink = 0.14;
    const eyeY = look.muted ? 0.3 : this._blink > 0 ? 0.12 : 1.15;
    for (const eye of this._eyes) eye.scale.y = eyeY;

    this._updateDizzy(dt);

    const pulse = 0.85 + Math.sin(t * 2.2 + p) * 0.15;
    this._haloMat.uniforms["uIntensity"]!.value = look.muted ? 0.25 : pulse + this._glowNow * 0.8 + this._mouthNow * 0.5;
  }

  private _updateDizzy(dt: number): void {
    const active = this._dizzyT >= 0;
    for (const s of this._spiralEyes) s.visible = active;
    for (const e of this._eyes) e.visible = !active;
    for (const s of this._shines) s.visible = !active;
    if (!active) {
      for (const s of this._stars) s.visible = false;
      return;
    }
    this._dizzyT += dt;
    const d = this._dizzyT;
    const p = d / DIZZY_SECONDS;
    if (p >= 1) {
      this._dizzyT = -1;
      return;
    }
    const side = this._dizzySide;

    // 1) Wobble left/right, 2) topple over to one side, 3) bounce back up.
    const wobbleEnv = smooth(p / 0.08) * (1 - smooth((p - 0.5) / 0.15));
    const fall = smooth((p - 0.55) / 0.22) * (1 - smooth((p - 0.8) / 0.18));
    const bounce = p > 0.85 ? Math.sin((p - 0.85) * Math.PI * 6) * 0.12 * (1 - p) * 6 : 0;
    const tilt = Math.sin(d * 9.5) * 0.42 * wobbleEnv + side * 1.2 * fall + bounce;
    // Rotate about the hem (not the middle) so it looks like it tips over.
    const pivot = 1.0;
    this._bob.rotation.z += tilt;
    this._bob.position.x += -Math.sin(tilt) * pivot + Math.sin(d * 9.5 + 0.7) * 0.15 * wobbleEnv;
    this._bob.position.y += (Math.cos(tilt) - 1) * pivot - 0.25 * fall;

    // Spiral eyes spin; arms flail; mouth goes "o".
    this._spiralEyes.forEach((s, i) => {
      s.children[0]!.rotation.z = d * (i === 0 ? 11 : -11);
    });
    this._arms.forEach((arm, idx) => {
      const sideA = idx === 0 ? -1 : 1;
      arm.rotation.z = sideA * (1.4 + Math.sin(d * 16 + idx * 2) * 0.6 * (1 - fall));
    });
    this._mouth.scale.y = 0.55 + Math.sin(d * 7) * 0.15;

    // Stars circle the head (fade out near the end).
    const starsOn = p < 0.92;
    this._stars.forEach((star, i) => {
      star.visible = starsOn;
      const a = d * 4 + (i * Math.PI * 2) / 3;
      star.position.set(Math.cos(a) * 0.55, 1.22 + Math.sin(a * 2) * 0.05, Math.sin(a) * 0.55);
      (star.material as SpriteMaterial).opacity = 1 - smooth((p - 0.8) / 0.12);
    });
  }

  dispose(): void {
    for (const tex of this._textures) tex.dispose();
    for (const d of this._disposables) d.dispose();
    this.root.removeFromParent();
  }
}
