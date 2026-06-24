import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getWeirOutlet } from "./DamGeometry";

export type CameraPresetId = "overview" | "weir" | "crown" | "sensors";

type CameraPose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
};

const PRESETS: Record<CameraPresetId, CameraPose> = {
  overview: {
    position: new THREE.Vector3(170, 88, 178),
    target: new THREE.Vector3(0, 8, 0),
  },
  weir: (() => {
    const outlet = getWeirOutlet();
    const target = outlet.position.clone();
    target.y = 10.8;
    const position = target
      .clone()
      .add(outlet.outward.clone().multiplyScalar(38))
      .add(new THREE.Vector3(-8, 14, 6));
    return { position, target };
  })(),
  crown: {
    position: new THREE.Vector3(40, 95, 60),
    target: new THREE.Vector3(6, 10.4, 22),
  },
  sensors: {
    position: new THREE.Vector3(-120, 45, 140),
    target: new THREE.Vector3(-80, 9, 110),
  },
};

export function createCameraPresetController(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls
) {
  let animId = 0;
  let fromPos = new THREE.Vector3();
  let fromTarget = new THREE.Vector3();
  let toPos = new THREE.Vector3();
  let toTarget = new THREE.Vector3();
  let start = 0;
  const duration = 1200;

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const tick = (now: number) => {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    const k = ease(t);
    camera.position.lerpVectors(fromPos, toPos, k);
    controls.target.lerpVectors(fromTarget, toTarget, k);
    controls.update();
    if (t < 1) {
      animId = requestAnimationFrame(tick);
    }
  };

  return {
    focus: (preset: CameraPresetId) => {
      cancelAnimationFrame(animId);
      const pose = PRESETS[preset];
      fromPos.copy(camera.position);
      fromTarget.copy(controls.target);
      toPos.copy(pose.position);
      toTarget.copy(pose.target);
      start = performance.now();
      animId = requestAnimationFrame(tick);
    },
    dispose: () => cancelAnimationFrame(animId),
  };
}
