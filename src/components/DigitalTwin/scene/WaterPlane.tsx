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
  /** Severidad física del rebose [0..1] calculada por el motor (Q/Q_diseño). */
  spillSeverity?: number;
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

  const beachMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      void main() {
        float t = vUv.x;
        vec3 wet = vec3(0.38, 0.32, 0.24);
        vec3 dry = vec3(0.62, 0.54, 0.42);
        vec3 color = mix(wet, dry, smoothstep(0.0, 1.0, t));
        float pulse = 0.92 + sin(time * 1.5) * 0.04;
        gl_FragColor = vec4(color * pulse, 0.78 - t * 0.2);
      }
    `,
  });
  const beachRing = new THREE.Mesh(new THREE.RingGeometry(82, 92, 96), beachMat);
  beachRing.rotation.x = -Math.PI / 2;
  beachRing.position.set(BOWL_CX, 5, BOWL_CZ);
  beachRing.renderOrder = 1;
  scene.add(beachRing);

  const warningRingMat = new THREE.MeshBasicMaterial({
    color: 0xd97706,
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
    const safeSpread = Number.isFinite(spreadM) ? spreadM : 0;
    const visualSpread = Math.max(safeSpread, 0.08) * (safeSpread > 0.02 ? 3.5 : 1);
    if (Math.abs(visualSpread - lastSpillSpread) < 0.05) return;
    lastSpillSpread = visualSpread;
    const shape = safeSpread > 0.02 ? getOverflowSpillShape(visualSpread) : lakeShape;
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
      // Severidad física del motor (Q/Q_diseño) con fallback geométrico si no viene.
      const physicalSeverity =
        typeof state.spillSeverity === "number"
          ? THREE.MathUtils.clamp(state.spillSeverity, 0, 1)
          : THREE.MathUtils.clamp(Math.max(0, -freeboard) / 1.5, 0, 1);
      const hydraulic = computeHydraulicAlert(freeboard, physicalSeverity);
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
      (beachMat.uniforms.time as { value: number }).value = state.time;

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
