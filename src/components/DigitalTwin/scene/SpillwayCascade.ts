import * as THREE from "three";
import { sampleTerrainHeight } from "@/components/DigitalTwin/terrainHeight";
import { getWeirArcCurve, getWeirOutlet } from "./DamGeometry";
import type { TailingsWaterShaderBundle } from "./shaders/TailingsWaterShader";

export type SpillwayCascadeSystem = {
  update: (surfaceY: number, spillM: number, spillSeverity: number, active: boolean, time: number) => void;
  dispose: () => void;
};

/** Vertedero tipo ogee + escalones aguas abajo (referencia EPA/ANCOLD spillway). */
export function createSpillwayCascadeSystem(
  scene: THREE.Scene,
  waterShader: TailingsWaterShaderBundle
): SpillwayCascadeSystem {
  const group = new THREE.Group();
  const weir = getWeirOutlet();
  const weirCurve = getWeirArcCurve();

  const crestMat = waterShader.createMaterial();
  const crestGeo = new THREE.PlaneGeometry(22, 3.2, 12, 2);
  const crestSheet = new THREE.Mesh(crestGeo, crestMat);
  crestSheet.renderOrder = 11;
  crestSheet.visible = false;
  group.add(crestSheet);

  const stepMeshes: THREE.Mesh[] = [];
  const stepCount = 9;
  for (let i = 0; i < stepCount; i += 1) {
    const mat = waterShader.createMaterial();
    const geo = new THREE.PlaneGeometry(4 + i * 1.8, 1.4 + (i % 2) * 0.3, 6, 2);
    const step = new THREE.Mesh(geo, mat);
    step.renderOrder = 10 - i * 0.1;
    step.visible = false;
    stepMeshes.push(step);
    group.add(step);
  }

  const chuteMat = waterShader.createMaterial();
  const chute = new THREE.Mesh(new THREE.PlaneGeometry(8, 28, 4, 12), chuteMat);
  chute.renderOrder = 8;
  chute.visible = false;
  group.add(chute);

  const toePoolMat = waterShader.createMaterial();
  const toePool = new THREE.Mesh(new THREE.CircleGeometry(6, 28), toePoolMat);
  toePool.rotation.x = -Math.PI / 2;
  toePool.renderOrder = 7;
  toePool.visible = false;
  group.add(toePool);

  const foamMat = new THREE.MeshBasicMaterial({
    color: 0x9aa39a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.2, 8, 2), foamMat);
  foam.renderOrder = 12;
  foam.visible = false;
  group.add(foam);

  scene.add(group);

  const placeAtWeir = (mesh: THREE.Mesh, along: number, liftY: number, tiltDown = 0) => {
    const p = weir.position.clone().add(weir.outward.clone().multiplyScalar(along));
    p.y = liftY;
    mesh.position.copy(p);
    const look = p.clone().add(weir.outward).add(new THREE.Vector3(0, -tiltDown - 2, 0));
    mesh.lookAt(look);
  };

  return {
    update: (surfaceY, spillM, spillSeverity, active, time) => {
      crestSheet.visible = active;
      chute.visible = active;
      toePool.visible = active;
      foam.visible = active;
      stepMeshes.forEach((s) => {
        s.visible = active;
      });

      if (!active) {
        waterShader.uniforms.weirBoost.value = 0;
        foamMat.opacity = 0;
        return;
      }

      const overCrest = Math.max(0.15, spillM * 0.55 + 0.25);
      const crestY = surfaceY + 0.05;

      placeAtWeir(crestSheet, 2, crestY, 0.2);
      crestSheet.scale.set(0.85 + spillSeverity * 0.5, 0.6 + overCrest * 0.9, 1);

      foam.position.copy(crestSheet.position);
      foam.position.y += 0.35;
      foam.lookAt(crestSheet.position.clone().add(weir.outward));
      foamMat.opacity = 0.35 + spillSeverity * 0.45 + Math.sin(time * 8) * 0.08;

      const startDown = crestY - 0.35;
      stepMeshes.forEach((step, i) => {
        const t = (i + 1) / stepCount;
        const along = 6 + t * (18 + spillSeverity * 14);
        const drop = t * (4.5 + spillM * 2.2);
        placeAtWeir(step, along, startDown - drop, 2.5 + t * 3);
        step.scale.set(0.7 + spillSeverity * 0.8 + t * 0.5, 0.8 + spillSeverity * 0.6, 1);
      });

      const chuteStart = weir.position.clone().add(weir.outward.clone().multiplyScalar(12));
      chuteStart.y = startDown - 1.2;
      chute.position.copy(chuteStart);
      const chuteLook = chuteStart.clone().add(weir.outward).add(new THREE.Vector3(0, -12, 0));
      chute.lookAt(chuteLook);
      chute.scale.set(0.9 + spillSeverity * 0.7, 1 + spillSeverity * 0.5, 1);

      const toe = weir.position.clone().add(weir.outward.clone().multiplyScalar(34 + spillSeverity * 16));
      toe.y = sampleTerrainHeight(toe.x, toe.z) + 0.18;
      toePool.position.copy(toe);
      toePool.scale.setScalar(0.8 + spillSeverity * 2.4);

      waterShader.uniforms.weirBoost.value = 0.65 + spillSeverity * 0.35 + Math.sin(time * 4.5) * 0.06;

      const arcPts = weirCurve.getPoints(12);
      crestSheet.position.lerp(
        arcPts[Math.floor(arcPts.length / 2)].clone().setY(crestY),
        0.35
      );
    },
    dispose: () => {
      scene.remove(group);
      crestSheet.geometry.dispose();
      chute.geometry.dispose();
      toePool.geometry.dispose();
      foam.geometry.dispose();
      foamMat.dispose();
      stepMeshes.forEach((s) => s.geometry.dispose());
    },
  };
}
