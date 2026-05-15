import * as THREE from "three";
import { getLakeShape } from "./DamGeometry";

/**
 * Nivel msnm → altura de superficie en unidades de escena.
 * Corona del dique ~ Y 10.5 (TailingDam crown), cota corona 786 msnm.
 * Por encima de 786 se entra en fase de desborde (786–787.5).
 */
const RELAVE_MIN = 774;
const RELAVE_MAX = 787.5;
const CROWN_LEVEL_M = 786;
/** Centro del vaso (alineado con getDamCurve en DamGeometry). */
const BOWL_CX = 6;
const BOWL_CZ = 22;
/** Y del piso del vaso (coincide con el liner / piso elevado del terreno). */
const BASIN_FLOOR_Y = 0.4;

function relaveMsnmToSurfaceY(levelM: number): number {
  const L = THREE.MathUtils.clamp(levelM, RELAVE_MIN, RELAVE_MAX);
  if (L <= 780) {
    return THREE.MathUtils.lerp(1.0, 5.0, (L - 774) / 6);
  }
  if (L <= 785) {
    return THREE.MathUtils.lerp(5.0, 9.2, (L - 780) / 5);
  }
  if (L <= CROWN_LEVEL_M) {
    return THREE.MathUtils.lerp(9.2, 10.4, (L - 785) / (CROWN_LEVEL_M - 785));
  }
  return THREE.MathUtils.lerp(10.4, 11.2, (L - CROWN_LEVEL_M) / (RELAVE_MAX - CROWN_LEVEL_M));
}

export type WaterPlaneVisualState = {
  relaveLevel: number;
  fillRate: number;
  rainIntensity: number;
  time: number;
};

export type WaterPlaneMetrics = {
  relaveLevel: number;
  freeboard: number;
};

export type WaterPlaneSystem = {
  update: (state: WaterPlaneVisualState, delta: number) => WaterPlaneMetrics;
  getCurrentHeight: () => number;
  dispose: () => void;
};

export function createWaterPlaneSystem(scene: THREE.Scene, _basinRadius: number): WaterPlaneSystem {
  const lakeShape = getLakeShape();

  // Liner (fondo del vaso): lámina oscura que se ve a través del agua semi-translúcida.
  const linerGeometry = new THREE.ShapeGeometry(lakeShape);
  linerGeometry.rotateX(-Math.PI / 2);
  const linerMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1512,
    roughness: 0.95,
    metalness: 0.02,
  });
  const liner = new THREE.Mesh(linerGeometry, linerMaterial);
  liner.position.y = BASIN_FLOOR_Y;
  liner.receiveShadow = true;
  scene.add(liner);

  // Superficie del agua: única capa visible, con oleaje por desplazamiento de vértices.
  const surfaceGeometry = new THREE.ShapeGeometry(lakeShape, 24);
  surfaceGeometry.rotateX(-Math.PI / 2);
  surfaceGeometry.computeVertexNormals();

  // Agua de relave real: gris-pardo oscuro con leve reflejo metálico,
  // casi opaco porque el relave decanta finos en superficie (ver fotos).
  const surfaceMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x4a4a44,
    roughness: 0.35,
    metalness: 0.2,
    transparent: true,
    opacity: 0.94,
    transmission: 0.05,
    thickness: 1.8,
    ior: 1.33,
    side: THREE.DoubleSide,
    clearcoat: 0.4,
    clearcoatRoughness: 0.55,
  });
  const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  surface.position.y = 5;
  surface.renderOrder = 2;
  scene.add(surface);

  // Anillo fino bajo el espejo: refuerza visualmente el rebose por encima de la corona (desborde literal).
  const crownHaloMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x4a4a44,
    emissive: 0x0a0a0a,
    emissiveIntensity: 0.06,
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
    opacity: 0.4,
    transmission: 0.2,
    ior: 1.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const crownHalo = new THREE.Mesh(
    new THREE.RingGeometry(76, 130, 96),
    crownHaloMaterial
  );
  crownHalo.rotation.x = -Math.PI / 2;
  crownHalo.position.set(BOWL_CX, relaveMsnmToSurfaceY(780), BOWL_CZ);
  crownHalo.visible = false;
  crownHalo.renderOrder = 3;
  scene.add(crownHalo);

  let smoothLevel = 780;
  let lastSurfaceY = 5;
  const position = surfaceGeometry.attributes.position as THREE.BufferAttribute;
  const baseLocalY = new Float32Array(position.count);
  for (let i = 0; i < position.count; i += 1) {
    baseLocalY[i] = position.getY(i);
  }

  return {
    update: (state, delta) => {
      const clampedLevel = THREE.MathUtils.clamp(state.relaveLevel, RELAVE_MIN, RELAVE_MAX);
      smoothLevel = THREE.MathUtils.lerp(
        smoothLevel,
        clampedLevel,
        THREE.MathUtils.clamp(delta * 1.4, 0.02, 0.2)
      );

      const surfaceY = relaveMsnmToSurfaceY(smoothLevel);
      lastSurfaceY = surfaceY;
      surface.position.y = surfaceY;

      // Oleaje sutil por desplazamiento de vértices
      for (let i = 0; i < position.count; i += 1) {
        const x = position.getX(i);
        const z = position.getZ(i);
        const ripple =
          Math.sin(x * 0.08 + state.time * 1.6) * 0.04 +
          Math.cos(z * 0.085 + state.time * 1.3) * 0.035 +
          Math.sin((x + z) * 0.05 + state.time * 4.0) * (state.rainIntensity / 90) * 0.08;
        position.setY(i, baseLocalY[i] + ripple);
      }
      position.needsUpdate = true;
      surfaceGeometry.computeVertexNormals();

      const spilling = smoothLevel > CROWN_LEVEL_M;
      const severe = smoothLevel >= CROWN_LEVEL_M - 0.2;
      const danger = spilling || severe;
      const overM = Math.max(0, smoothLevel - CROWN_LEVEL_M);

      // Desborde: mismo tono opaco/cremoso, sin tinte rojo vs azul aislado.
      surfaceMaterial.color.set(danger ? 0x4f4b44 : 0x4a4a44);
      surfaceMaterial.opacity = danger ? 0.97 : 0.94;
      surfaceMaterial.transmission = danger ? 0.05 : 0.05;
      if (danger) {
        surfaceMaterial.emissive.setHex(0x080808);
        surfaceMaterial.emissiveIntensity = 0.04 + overM * 0.1;
      } else {
        surfaceMaterial.emissive.setHex(0x000000);
        surfaceMaterial.emissiveIntensity = 0;
      }
      linerMaterial.color.set(danger ? 0x2a0a0a : 0x1a1512);

      crownHalo.position.y = surfaceY - 0.04;
      crownHalo.position.x = BOWL_CX;
      crownHalo.position.z = BOWL_CZ;
      crownHalo.visible = spilling;
      crownHaloMaterial.opacity = THREE.MathUtils.clamp(0.28 + overM * 0.32, 0, 0.9);
      crownHaloMaterial.emissiveIntensity = 0.15 + overM * 0.22;
      crownHalo.scale.setScalar(1 + overM * 0.04);

      return {
        relaveLevel: smoothLevel,
        freeboard: CROWN_LEVEL_M - smoothLevel,
      };
    },
    getCurrentHeight: () => lastSurfaceY,
    dispose: () => {
      scene.remove(surface);
      scene.remove(liner);
      scene.remove(crownHalo);
      surfaceGeometry.dispose();
      surfaceMaterial.dispose();
      linerGeometry.dispose();
      linerMaterial.dispose();
      (crownHalo.geometry as THREE.BufferGeometry).dispose();
      crownHaloMaterial.dispose();
    },
  };
}
