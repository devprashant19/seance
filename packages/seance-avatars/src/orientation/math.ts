import { Quaternion, Vector3, MathUtils } from "three";

const _qZ = new Quaternion();
const _qX = new Quaternion();
const _qY = new Quaternion();
const _screenCorrection = new Quaternion().setFromAxisAngle(
  new Vector3(1, 0, 0),
  -Math.PI / 2,
);

const MAX_STEP_RAD = MathUtils.degToRad(35);

export function deviceOrientationToQuaternion(
  alphaRad: number,
  betaRad: number,
  gammaRad: number,
): Quaternion {
  _qZ.setFromAxisAngle(new Vector3(0, 0, 1), alphaRad);
  _qX.setFromAxisAngle(new Vector3(1, 0, 0), betaRad);
  _qY.setFromAxisAngle(new Vector3(0, 1, 0), gammaRad);

  const q = new Quaternion();
  q.copy(_qZ).multiply(_qX).multiply(_qY);
  q.premultiply(_screenCorrection);
  q.normalize();
  return q;
}

export function captureReference(samples: Quaternion[]): Quaternion {
  if (samples.length === 0) return new Quaternion();

  let ax = 0, ay = 0, az = 0, aw = 0;
  const ref = samples[0]!;

  for (const s of samples) {
    const dot = ref.x * s.x + ref.y * s.y + ref.z * s.z + ref.w * s.w;
    const sign = dot < 0 ? -1 : 1;
    ax += s.x * sign;
    ay += s.y * sign;
    az += s.z * sign;
    aw += s.w * sign;
  }

  const result = new Quaternion(ax, ay, az, aw);
  result.normalize();
  return result;
}

export function headingNormaliser(qRef: Quaternion): Quaternion {
  const forward = new Vector3(0, 0, -1).applyQuaternion(qRef);
  const up = new Vector3(0, 1, 0).applyQuaternion(qRef);

  let f: Vector3;
  if (Math.abs(up.y) < Math.cos(MathUtils.degToRad(45))) {
    f = new Vector3(0, 0, -1).applyQuaternion(qRef);
  } else {
    f = forward;
  }

  f.y = 0;
  if (f.lengthSq() < 1e-6) {
    return new Quaternion();
  }
  f.normalize();

  const target = new Vector3(0, 0, -1);
  const yaw = new Quaternion().setFromUnitVectors(f, target);
  return yaw;
}

export function computeGhostRotation(
  qNow: Quaternion,
  qRef: Quaternion,
  Y: Quaternion,
): Quaternion {
  const qRefInv = qRef.clone().invert();
  const relative = qNow.clone().multiply(qRefInv);

  const yInv = Y.clone().invert();
  const result = Y.clone().multiply(relative).multiply(yInv);
  result.normalize();
  return result;
}

export function smoothStep(
  current: Quaternion,
  target: Quaternion,
  dt: number,
  tau = 0.06,
): Quaternion {
  const alpha = 1 - Math.exp(-dt / tau);

  const angle = 2 * Math.acos(Math.min(1, Math.abs(current.dot(target))));
  const maxAlpha = angle > 1e-6 ? MAX_STEP_RAD / angle : 1;
  const clampedAlpha = Math.min(alpha, maxAlpha);

  const result = current.clone().slerp(target, clampedAlpha);
  result.normalize();
  return result;
}
