import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  LatheGeometry,
  MeshPhysicalMaterial,
  Mesh,
  SphereGeometry,
  PointLight,
  MeshBasicMaterial,
  Vector2,
  Color,
  Quaternion,
  Vector3,
} from "three";
import type { MoodVisualConfig } from "../mood/visuals.js";

const PROFILE_SEGMENTS = 24;
const LATHE_SEGMENTS = 32;

function bellProfile(): Vector2[] {
  const points: Vector2[] = [];
  for (let i = 0; i <= PROFILE_SEGMENTS; i++) {
    const t = i / PROFILE_SEGMENTS;
    const r = 0.5 * Math.exp(-((t - 0.3) ** 2) / 0.08) + 0.05;
    const y = t * 2 - 0.5;
    points.push(new Vector2(r, y));
  }
  return points;
}

export interface Poltergeist3DConfig {
  readonly container: HTMLElement;
  readonly width?: number;
  readonly height?: number;
}

export class Poltergeist3D {
  private readonly _scene: Scene;
  private readonly _camera: PerspectiveCamera;
  private readonly _renderer: WebGLRenderer;
  private readonly _body: Mesh;
  private readonly _lantern: Mesh;
  private readonly _light: PointLight;
  private readonly _eyeL: Mesh;
  private readonly _eyeR: Mesh;
  private _animId = 0;
  private _time = 0;
  private _mood: MoodVisualConfig | undefined;
  private _targetRotation = new Quaternion();
  private _shakeOffset = new Vector3();

  constructor(config: Poltergeist3DConfig) {
    const w = config.width ?? config.container.clientWidth;
    const h = config.height ?? config.container.clientHeight;

    this._scene = new Scene();
    this._camera = new PerspectiveCamera(50, w / h, 0.1, 100);
    this._camera.position.set(0, 0.8, 3);
    this._camera.lookAt(0, 0.5, 0);

    this._renderer = new WebGLRenderer({ alpha: true, antialias: true });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    config.container.appendChild(this._renderer.domElement);

    const bodyGeo = new LatheGeometry(bellProfile(), LATHE_SEGMENTS);
    const bodyMat = new MeshPhysicalMaterial({
      color: 0xccddff,
      transparent: true,
      opacity: 0.9,
      roughness: 0.3,
      metalness: 0,
      emissive: new Color(0x88aaff),
      emissiveIntensity: 0.2,
    });
    this._body = new Mesh(bodyGeo, bodyMat);
    this._scene.add(this._body);

    const lanternGeo = new SphereGeometry(0.08, 16, 16);
    const lanternMat = new MeshBasicMaterial({
      color: 0xffee88,
      transparent: true,
      opacity: 0.9,
    });
    this._lantern = new Mesh(lanternGeo, lanternMat);
    this._lantern.position.set(0, 0.6, 0);
    this._body.add(this._lantern);

    this._light = new PointLight(0xffee88, 1.5, 5);
    this._light.position.copy(this._lantern.position);
    this._body.add(this._light);

    const eyeMat = new MeshBasicMaterial({ color: 0x111122 });
    const eyeGeo = new SphereGeometry(0.03, 8, 8);
    eyeGeo.scale(1, 1.4, 0.5);
    this._eyeL = new Mesh(eyeGeo, eyeMat);
    this._eyeL.position.set(-0.1, 1.0, 0.35);
    this._body.add(this._eyeL);
    this._eyeR = new Mesh(eyeGeo.clone(), eyeMat);
    this._eyeR.position.set(0.1, 1.0, 0.35);
    this._body.add(this._eyeR);
  }

  start(): void {
    const tick = () => {
      this._animId = requestAnimationFrame(tick);
      this._time += 1 / 60;
      this._update();
      this._renderer.render(this._scene, this._camera);
    };
    tick();
  }

  stop(): void {
    cancelAnimationFrame(this._animId);
  }

  setRotation(q: Quaternion): void {
    this._targetRotation.copy(q);
  }

  setShake(offset: Vector3): void {
    this._shakeOffset.copy(offset);
  }

  setMood(config: MoodVisualConfig): void {
    this._mood = config;
  }

  dispose(): void {
    this.stop();
    this._renderer.dispose();
    this._renderer.domElement.remove();
  }

  private _update(): void {
    this._body.quaternion.slerp(this._targetRotation, 0.15);
    this._body.position.lerp(this._shakeOffset, 0.2);

    if (this._mood) {
      const m = this._mood;
      const bodyMat = this._body.material as MeshPhysicalMaterial;
      bodyMat.opacity = m.opacity;
      bodyMat.emissiveIntensity = m.glow * 0.3;

      const hsl = new Color().setHSL(m.hue / 360, 0.6, 0.7);
      bodyMat.emissive.copy(hsl);

      this._lantern.scale.setScalar(m.lanternScale);
      this._light.intensity = m.glow * 1.5;

      const floatY = Math.sin(this._time * m.floatFreq * Math.PI * 2) * m.floatAmp;
      this._body.position.y += floatY;

      const positions = this._body.geometry.attributes.position;
      if (positions && m.hemWobbleSpeed > 0) {
        const arr = positions.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          const y = arr[i + 1]!;
          if (y < 0) {
            arr[i] = arr[i]! + Math.sin(this._time * m.hemWobbleSpeed * 3 + y * 5) * 0.002;
          }
        }
        positions.needsUpdate = true;
      }

      const blinkCycle = this._time % 4;
      const blinkScale = blinkCycle > 3.8 ? Math.max(0.1, 1 - (blinkCycle - 3.8) * 5) : 1;
      this._eyeL.scale.y = blinkScale * 1.4;
      this._eyeR.scale.y = blinkScale * 1.4;
    }
  }
}
