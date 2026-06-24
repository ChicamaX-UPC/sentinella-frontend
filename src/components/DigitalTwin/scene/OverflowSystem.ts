import * as THREE from "three";
import { sampleTerrainHeight } from "@/components/DigitalTwin/terrainHeight";
import { computeHydraulicAlert } from "./AlertSemantics";
import { createFlowRibbonSystem } from "./FlowRibbon";
import { getWeirOutlet } from "./DamGeometry";
import { createTailingsWaterShaderBundle } from "./shaders/TailingsWaterShader";
import { createSpillwayCascadeSystem } from "./SpillwayCascade";
import { createWeirSpillSurfaceSystem } from "./WeirSpillSurface";
import { createWetTerrainDecalSystem } from "./WetTerrainDecal";

export type OverflowVisualState = {
  freeboard: number;
  spillSeverity: number;
  surfaceY: number;
  time: number;
  delta?: number;
};

export type OverflowSystem = {
  update: (state: OverflowVisualState) => void;
  dispose: () => void;
};

export function createOverflowSystem(scene: THREE.Scene): OverflowSystem {
  const group = new THREE.Group();
  const weir = getWeirOutlet();
  const waterShader = createTailingsWaterShaderBundle();
  const weirSpill = createWeirSpillSurfaceSystem(scene, waterShader);
  const spillway = createSpillwayCascadeSystem(scene, waterShader);
  const flowRibbon = createFlowRibbonSystem(scene, waterShader);
  const wetDecal = createWetTerrainDecalSystem(scene);

  const beacon = new THREE.PointLight(0xef4444, 0, 55, 2);
  beacon.position.copy(weir.position);
  group.add(beacon);

  const beaconMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0 })
  );
  beaconMesh.visible = false;
  group.add(beaconMesh);

  const N_SPLASH = 120;
  const splashPos = new Float32Array(N_SPLASH * 3);
  const splashGeo = new THREE.BufferGeometry();
  splashGeo.setAttribute("position", new THREE.BufferAttribute(splashPos, 3));
  const splashMat = new THREE.PointsMaterial({
    color: 0xd8e4ec,
    size: 1.2,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const splashes = new THREE.Points(splashGeo, splashMat);
  splashes.frustumCulled = false;
  splashes.renderOrder = 10;
  group.add(splashes);

  const resetSplash = (i: number, surfaceY: number, t: number) => {
    const spread = (i % 12) * 0.22;
    const p = weir.position.clone();
    p.y = surfaceY + 0.2;
    p.add(weir.outward.clone().multiplyScalar(6 + spread));
    p.x += Math.sin(t + i) * 0.5;
    p.z += Math.cos(t * 1.1 + i) * 0.5;
    splashPos[i * 3] = p.x;
    splashPos[i * 3 + 1] = p.y;
    splashPos[i * 3 + 2] = p.z;
  };
  for (let i = 0; i < N_SPLASH; i += 1) {
    resetSplash(i, 10.4, i * 0.2);
  }

  scene.add(group);

  return {
    update: (state) => {
      const d = THREE.MathUtils.clamp(state.delta ?? 0.016, 0.001, 0.12);
      const hydraulic = computeHydraulicAlert(state.freeboard, state.spillSeverity);
      const { activeOverflow, spillSeverity, spillM } = hydraulic;

      waterShader.update({
        time: state.time,
        freeboard: state.freeboard,
        spillSeverity,
        weirBoost: activeOverflow ? 0.5 + spillSeverity * 0.5 : 0,
      });

      weirSpill.update(state.surfaceY, spillM, spillSeverity, activeOverflow, state.time);
      spillway.update(state.surfaceY, spillM, spillSeverity, activeOverflow, state.time);
      flowRibbon.update(state.surfaceY, spillSeverity, activeOverflow);
      wetDecal.update(spillSeverity, activeOverflow);

      const beaconPulse = activeOverflow ? (2.2 + Math.sin(state.time * 6) * 1.2) * spillSeverity : 0;
      beacon.intensity = beaconPulse;
      beacon.position.copy(weir.position);
      beacon.position.y = state.surfaceY + 2.8;
      beaconMesh.visible = activeOverflow;
      beaconMesh.position.copy(beacon.position);
      (beaconMesh.material as THREE.MeshBasicMaterial).opacity = activeOverflow
        ? 0.75 + spillSeverity * 0.25
        : 0;

      splashMat.opacity = activeOverflow ? 0.5 + spillSeverity * 0.5 : 0;
      splashes.visible = activeOverflow;
      const fall = (18 + spillSeverity * 35) * d;
      for (let i = 0; i < N_SPLASH; i += 1) {
        const ax = i * 3;
        splashPos[ax + 1] -= fall;
        splashPos[ax] += weir.outward.x * fall * 0.4;
        splashPos[ax + 2] += weir.outward.z * fall * 0.4;
        if (splashPos[ax + 1] < sampleTerrainHeight(splashPos[ax], splashPos[ax + 2]) + 0.4) {
          resetSplash(i, state.surfaceY, state.time);
        }
      }
      (splashGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    },
    dispose: () => {
      scene.remove(group);
      weirSpill.dispose();
      spillway.dispose();
      flowRibbon.dispose();
      wetDecal.dispose();
      waterShader.dispose();
      splashGeo.dispose();
      splashMat.dispose();
      beaconMesh.geometry.dispose();
      (beaconMesh.material as THREE.Material).dispose();
    },
  };
}
