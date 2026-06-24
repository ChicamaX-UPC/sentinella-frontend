import * as THREE from "three";
import {
  BASIN_FLOOR_Y,
  BOWL_CX,
  BOWL_CZ,
  CROWN_ELEVATION_M,
  OVERFLOW_SIM_MAX_M,
  RELAVE_MIN_M,
  relaveMsnmToSurfaceY,
} from "@/components/DigitalTwin/constants";
import { computeHydraulicAlert } from "./AlertSemantics";
import { getLakeShape, getOverflowSpillShape } from "./DamGeometry";
import { createTailingsWaterShaderBundle } from "./shaders/TailingsWaterShader";

export type WaterPlaneVisualState = {
  relaveLevel: number;
  fillRate: number;
  rainIntensity: number;
  time: number;
};

export type WaterPlaneMetrics = {
  relaveLevel: number;
  freeboard: number;
  spillSeverity: number;
  spillM: number;
};

export type WaterPlaneSystem = {
  update: (state: WaterPlaneVisualState, delta: number) => WaterPlaneMetrics;
  getCurrentHeight: () => number;
  dispose: () => void;
};

const GEOMEMBRANE = 0x2c2c2c;

export function createWaterPlaneSystem(scene: THREE.Scene, _basinRadius: number): WaterPlaneSystem {
  const lakeShape = getLakeShape();
  const waterShader = createTailingsWaterShaderBundle();

  const linerGeometry = new THREE.ShapeGeometry(lakeShape);
  linerGeometry.rotateX(-Math.PI / 2);
  const linerMaterial = new THREE.MeshStandardMaterial({
    color: GEOMEMBRANE,
    roughness: 0.92,
    metalness: 0.03,
  });
  const liner = new THREE.Mesh(linerGeometry, linerMaterial);
  liner.position.y = BASIN_FLOOR_Y;
  liner.receiveShadow = true;
  scene.add(liner);

  let surfaceGeometry = new THREE.ShapeGeometry(lakeShape, 48);
  surfaceGeometry.rotateX(-Math.PI / 2);
  surfaceGeometry.computeVertexNormals();

  const surfaceMaterial = waterShader.createMaterial();
  const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  surface.position.y = 5;
  surface.renderOrder = 2;
  scene.add(surface);

  const beachMat = new THREE.MeshStandardMaterial({
    color: 0x5c4e3a,
    roughness: 0.96,
    metalness: 0.02,
    transparent: true,
    opacity: 0.75,
  });
  const beachRing = new THREE.Mesh(new THREE.RingGeometry(82, 92, 96), beachMat);
  beachRing.rotation.x = -Math.PI / 2;
  beachRing.position.set(BOWL_CX, 5, BOWL_CZ);
  beachRing.renderOrder = 1;
  scene.add(beachRing);

  const warningRingMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const warningRing = new THREE.Mesh(new THREE.RingGeometry(88, 94, 96), warningRingMat);
  warningRing.rotation.x = -Math.PI / 2;
  warningRing.position.set(BOWL_CX, 5, BOWL_CZ);
  warningRing.renderOrder = 4;
  scene.add(warningRing);

  let smoothLevel = 780;
  let lastSurfaceY = 5;
  const initialPos = surfaceGeometry.attributes.position as THREE.BufferAttribute;

  let rippleFrame = 0;
  let lastSpillSpread = 0;
  let baseLocalY = new Float32Array(initialPos.count);
  for (let i = 0; i < initialPos.count; i += 1) {
    baseLocalY[i] = initialPos.getY(i);
  }

  const rebuildSurface = (spreadM: number) => {
    if (Math.abs(spreadM - lastSpillSpread) < 0.05) return;
    lastSpillSpread = spreadM;
    const shape = spreadM > 0.02 ? getOverflowSpillShape(spreadM) : lakeShape;
    surfaceGeometry.dispose();
    surfaceGeometry = new THREE.ShapeGeometry(shape, 48);
    surfaceGeometry.rotateX(-Math.PI / 2);
    surfaceGeometry.computeVertexNormals();
    surface.geometry = surfaceGeometry;
    const pos = surfaceGeometry.attributes.position as THREE.BufferAttribute;
    baseLocalY = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i += 1) {
      baseLocalY[i] = pos.getY(i);
    }
  };

  return {
    update: (state, delta) => {
      const clampedLevel = THREE.MathUtils.clamp(state.relaveLevel, RELAVE_MIN_M, OVERFLOW_SIM_MAX_M);
      smoothLevel = THREE.MathUtils.lerp(
        smoothLevel,
        clampedLevel,
        THREE.MathUtils.clamp(delta * 1.4, 0.02, 0.2)
      );

      const surfaceY = relaveMsnmToSurfaceY(smoothLevel);
      lastSurfaceY = surfaceY;
      surface.position.y = surfaceY;

      const freeboard = CROWN_ELEVATION_M - smoothLevel;
      const hydraulic = computeHydraulicAlert(freeboard, THREE.MathUtils.clamp(Math.max(0, -freeboard) / 1.5, 0, 1));
      const { spillSeverity, spillM, lowFreeboard, activeOverflow } = hydraulic;

      rebuildSurface(spillM);

      const rainRipple = state.rainIntensity / 90;
      const pos = surfaceGeometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i += 1) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const ripple =
          Math.sin(x * 0.05 + state.time * 1.2) * 0.03 +
          Math.cos(z * 0.055 + state.time * 1.0) * 0.028 +
          Math.sin((x + z) * 0.035 + state.time * 2.8) * (0.02 + rainRipple * 0.08);
        pos.setY(i, baseLocalY[i] + ripple);
      }
      pos.needsUpdate = true;
      if (rippleFrame % 3 === 0) {
        surfaceGeometry.computeVertexNormals();
      }
      rippleFrame += 1;

      beachRing.position.y = surfaceY - 0.22;
      beachMat.opacity = 0.55 + spillSeverity * 0.2;

      waterShader.update({ time: state.time, freeboard, spillSeverity, weirBoost: activeOverflow ? spillSeverity : 0 });
      linerMaterial.color.setHex(activeOverflow ? 0x2a2520 : lowFreeboard ? 0x252220 : GEOMEMBRANE);

      const warnPulse = lowFreeboard && !activeOverflow ? 0.35 + Math.sin(state.time * 5) * 0.25 : 0;
      warningRing.position.y = surfaceY - 0.06;
      warningRingMat.opacity = warnPulse;
      warningRing.visible = warnPulse > 0.05;

      return { relaveLevel: smoothLevel, freeboard, spillSeverity, spillM };
    },
    getCurrentHeight: () => lastSurfaceY,
    dispose: () => {
      scene.remove(surface);
      scene.remove(liner);
      scene.remove(warningRing);
      scene.remove(beachRing);
      surfaceGeometry.dispose();
      waterShader.dispose();
      beachMat.dispose();
      (beachRing.geometry as THREE.BufferGeometry).dispose();
      linerGeometry.dispose();
      linerMaterial.dispose();
      warningRingMat.dispose();
      (warningRing.geometry as THREE.BufferGeometry).dispose();
    },
  };
}
