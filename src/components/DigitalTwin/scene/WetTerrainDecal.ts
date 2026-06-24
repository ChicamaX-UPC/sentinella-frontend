import * as THREE from "three";
import { sampleTerrainHeight } from "@/components/DigitalTwin/terrainHeight";
import { getWeirOutlet } from "./DamGeometry";

export type WetTerrainDecalSystem = {
  update: (spillSeverity: number, active: boolean) => void;
  dispose: () => void;
};

export function createWetTerrainDecalSystem(scene: THREE.Scene): WetTerrainDecalSystem {
  const weir = getWeirOutlet();
  const group = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x3a4548,
    transparent: true,
    opacity: 0,
    roughness: 0.22,
    metalness: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const stain = new THREE.Mesh(new THREE.PlaneGeometry(22, 32), mat);
  stain.rotation.x = -Math.PI / 2;
  stain.renderOrder = 3;
  stain.visible = false;
  group.add(stain);

  const puddleMat = mat.clone();
  const puddles: THREE.Mesh[] = [];
  for (const along of [16, 28, 40]) {
    const pos = weir.position.clone().add(weir.outward.clone().multiplyScalar(along));
    pos.y = sampleTerrainHeight(pos.x, pos.z) + 0.08;
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(3.5, 20), puddleMat.clone());
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.copy(pos);
    puddle.visible = false;
    puddle.renderOrder = 4;
    puddles.push(puddle);
    group.add(puddle);
  }

  scene.add(group);

  return {
    update: (spillSeverity, active) => {
      const opacity = active ? 0.15 + spillSeverity * 0.35 : 0;
      stain.visible = active;
      if (active) {
        const center = weir.position.clone().add(weir.outward.clone().multiplyScalar(20));
        center.y = sampleTerrainHeight(center.x, center.z) + 0.05;
        stain.position.copy(center);
        stain.scale.set(0.7 + spillSeverity * 1.4, 1 + spillSeverity * 1.8, 1);
        mat.opacity = opacity;
      }

      puddles.forEach((p) => {
        p.visible = active;
        const pm = p.material as THREE.MeshStandardMaterial;
        pm.opacity = 0.25 + spillSeverity * 0.5;
        p.scale.setScalar(0.6 + spillSeverity * 2.2);
      });
    },
    dispose: () => {
      scene.remove(group);
      stain.geometry.dispose();
      mat.dispose();
      puddles.forEach((p) => {
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
      });
    },
  };
}
