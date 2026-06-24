import * as THREE from "three";
import { DESIGN_RAIN_MM_H, RAIN_WARNING_MM_H } from "@/components/DigitalTwin/constants";
import { getDamCurve } from "./DamGeometry";

export type DrainageVisualState = {
  rainIntensity: number;
  waterSurfaceY: number;
  time: number;
  spillSeverity: number;
};

export type DrainageSystem = {
  update: (state: DrainageVisualState) => void;
  dispose: () => void;
};

export function createDrainageSystem(scene: THREE.Scene): DrainageSystem {
  const group = new THREE.Group();
  const damCurve = getDamCurve();

  const canalMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    emissive: 0x0f172a,
    emissiveIntensity: 0.25,
    roughness: 0.55,
    metalness: 0.2,
  });
  const canalPoints = damCurve.getPoints(140);
  const canalPath = new THREE.CatmullRomCurve3(canalPoints, true, "catmullrom", 0.5);
  const canalMesh = new THREE.Mesh(new THREE.TubeGeometry(canalPath, 200, 0.55, 8, true), canalMat);
  canalMesh.position.y = 10.35;
  canalMesh.visible = false;
  group.add(canalMesh);

  const flowDrops: THREE.Mesh[] = [];
  for (let i = 0; i < 18; i += 1) {
    const drop = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0x93c5fd,
        emissive: 0x1e3a8a,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0,
      })
    );
    drop.visible = false;
    flowDrops.push(drop);
    group.add(drop);
  }

  const boxMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7, metalness: 0.25 });
  for (let i = 0; i < 5; i += 1) {
    const t = (i + 0.5) / 5;
    const p = damCurve.getPoint(t);
    const tan = damCurve.getTangent(t);
    const outward = new THREE.Vector3(tan.z, 0, -tan.x).normalize();
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.6, 2.2), boxMat);
    box.position.copy(p).add(outward.multiplyScalar(10));
    box.position.y = 9.8;
    group.add(box);
  }

  const dissipatorMat = new THREE.MeshStandardMaterial({ color: 0x0e7490, roughness: 0.45, metalness: 0.1 });
  const dissipatorPools: THREE.Mesh[] = [];
  [0.22, 0.78].forEach((t) => {
    const p = damCurve.getPoint(t);
    const tan = damCurve.getTangent(t);
    const outward = new THREE.Vector3(tan.z, 0, -tan.x).normalize();
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.9, 20), dissipatorMat.clone());
    pool.position.copy(p).add(outward.multiplyScalar(16));
    pool.position.y = 1.1;
    dissipatorPools.push(pool);
    group.add(pool);
  });

  const spillWaterMat = new THREE.MeshStandardMaterial({
    color: 0x6a7580,
    transparent: true,
    opacity: 0,
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0x1a2830,
    emissiveIntensity: 0.2,
  });
  const spillWaterLayers: THREE.Mesh[] = [];
  dissipatorPools.forEach((pool) => {
    const water = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.35, 20), spillWaterMat.clone());
    water.position.copy(pool.position);
    water.position.y += 0.35;
    water.visible = false;
    spillWaterLayers.push(water);
    group.add(water);
  });

  const decantPond = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7, 0.7, 24),
    new THREE.MeshStandardMaterial({ color: 0x3d4f5c, roughness: 0.55, metalness: 0.06 })
  );
  decantPond.position.set(-26, 0.45, 58);
  group.add(decantPond);

  const pipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(20, 1.2, 45),
    new THREE.Vector3(55, 1.5, 62),
    new THREE.Vector3(95, 2.2, 88),
    new THREE.Vector3(130, 2.8, 105),
  ]);
  const pipeline = new THREE.Mesh(
    new THREE.TubeGeometry(pipeCurve, 24, 0.45, 10, false),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.3 })
  );
  group.add(pipeline);

  const barge = new THREE.Mesh(
    new THREE.BoxGeometry(3, 1, 2),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.65, metalness: 0.35 })
  );
  barge.position.set(0, 6.5, -30);
  barge.castShadow = true;
  group.add(barge);

  const bargeRail = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.15, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.4 })
  );
  bargeRail.position.set(0, 0.55, 0);
  barge.add(bargeRail);

  scene.add(group);

  return {
    update: (state) => {
      const rain = THREE.MathUtils.clamp(state.rainIntensity, 0, 80);
      const spill = THREE.MathUtils.clamp(state.spillSeverity, 0, 1);
      const flowLevel = Math.max(rain / 80, spill);
      const canalActive = rain >= 12 || spill > 0.15;
      canalMesh.visible = canalActive;
      const critical = rain >= DESIGN_RAIN_MM_H || spill > 0.65;
      const warning = rain >= RAIN_WARNING_MM_H || spill > 0.25;
      canalMat.color.set(critical ? 0xef4444 : warning ? 0xf59e0b : spill > 0.15 ? 0x5a6a7a : 0x334155);
      canalMat.emissive.set(critical ? 0x7f1d1d : warning ? 0x78350f : 0x0f172a);
      canalMat.emissiveIntensity = canalActive ? THREE.MathUtils.lerp(0.25, 1.3, flowLevel) : 0.2;
      canalMesh.scale.y = 0.85 + flowLevel * 0.35;

      flowDrops.forEach((drop, i) => {
        const show = warning || spill > 0.2;
        drop.visible = show;
        const mat = drop.material as THREE.MeshStandardMaterial;
        mat.opacity = show ? 0.45 + flowLevel * 0.45 : 0;
        mat.color.set(spill > 0.3 ? 0x8a8580 : 0x93c5fd);
        const t = ((state.time * (0.35 + flowLevel * 0.4) + i * 0.06) % 1);
        const p = canalPath.getPoint(t);
        drop.position.set(p.x, 10.05 + flowLevel * 0.25 + Math.sin(state.time * 4 + i) * 0.12, p.z);
      });

      const pondMat = decantPond.material as THREE.MeshStandardMaterial;
      pondMat.emissive.set(spill > 0.2 ? 0x1e3a5f : 0x000000);
      pondMat.emissiveIntensity = spill * 0.4;

      const pipeMat = pipeline.material as THREE.MeshStandardMaterial;
      pipeMat.emissiveIntensity = critical || spill > 0.5 ? 0.35 : 0;

      spillWaterLayers.forEach((layer, i) => {
        const show = spill > 0.2;
        layer.visible = show;
        const mat = layer.material as THREE.MeshStandardMaterial;
        mat.opacity = show ? 0.45 + spill * 0.45 : 0;
        layer.scale.y = 0.5 + spill * 2.2;
        layer.position.y = dissipatorPools[i].position.y + 0.2 + spill * 0.35;
      });

      barge.position.y = state.waterSurfaceY + 0.35 + Math.sin(state.time * 1.2) * 0.06;
      barge.rotation.z = Math.sin(state.time * 0.8) * 0.02;
    },
    dispose: () => {
      scene.remove(group);
      group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = (mesh as { material?: THREE.Material }).material;
        if (mat) (mat as THREE.Material).dispose();
      });
    },
  };
}
