import * as THREE from "three";
import { computeHydraulicAlert } from "./AlertSemantics";
import { createSpillFlowShaderBundle } from "./shaders/SpillFlowShader";
import { createSpillFlowSystem } from "./SpillFlowSystem";
import { createSpraySystem } from "./SpraySystem";
import { getWeirOutlet } from "./DamGeometry";

export type OverflowVisualState = {
  freeboard: number;
  spillSeverity: number;
  spillFlowM3s: number;
  surfaceY: number;
  time: number;
  delta?: number;
};

export type OverflowSystem = {
  update: (state: OverflowVisualState) => void;
  dispose: () => void;
};

export function createOverflowSystem(scene: THREE.Scene, isMobile = false): OverflowSystem {
  const group = new THREE.Group();
  const weir = getWeirOutlet();
  const spillShader = createSpillFlowShaderBundle();
  const spillFlow = createSpillFlowSystem(scene, spillShader);
  const spray = createSpraySystem(scene, isMobile);

  const beacon = new THREE.PointLight(0xef4444, 0, 55, 2);
  beacon.position.copy(weir.position);
  group.add(beacon);

  const beaconMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0 })
  );
  beaconMesh.visible = false;
  group.add(beaconMesh);

  scene.add(group);

  return {
    update: (state) => {
      const d = THREE.MathUtils.clamp(state.delta ?? 0.016, 0.001, 0.12);
      const hydraulic = computeHydraulicAlert(state.freeboard, state.spillSeverity);
      const { activeOverflow, spillSeverity, spillM } = hydraulic;

      spillFlow.update(
        state.surfaceY,
        spillM,
        spillSeverity,
        state.spillFlowM3s,
        activeOverflow,
        state.time,
        d
      );

      spray.update(
        spillFlow.getImpactPoint(),
        spillFlow.getChannelPoints(),
        spillSeverity,
        state.spillFlowM3s,
        activeOverflow,
        state.time
      );

      const beaconPulse = activeOverflow ? (2.2 + Math.sin(state.time * 6) * 1.2) * spillSeverity : 0;
      beacon.intensity = beaconPulse;
      beacon.position.copy(weir.position);
      beacon.position.y = state.surfaceY + 2.8;
      beaconMesh.visible = activeOverflow;
      beaconMesh.position.copy(beacon.position);
      (beaconMesh.material as THREE.MeshBasicMaterial).opacity = activeOverflow
        ? 0.75 + spillSeverity * 0.25
        : 0;
    },
    dispose: () => {
      scene.remove(group);
      spillFlow.dispose();
      spray.dispose();
      spillShader.dispose();
      beaconMesh.geometry.dispose();
      (beaconMesh.material as THREE.Material).dispose();
    },
  };
}
