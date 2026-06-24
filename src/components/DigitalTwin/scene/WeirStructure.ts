import * as THREE from "three";
import { sampleTerrainHeight } from "@/components/DigitalTwin/terrainHeight";
import { getWeirArcCurve, getWeirOutlet } from "./DamGeometry";

export type WeirStructureSystem = {
  dispose: () => void;
};

/** Infraestructura fija del vertedero: canal de concreto escalonado aguas abajo. */
export function createWeirStructureSystem(scene: THREE.Scene): WeirStructureSystem {
  const group = new THREE.Group();
  const weir = getWeirOutlet();
  const arc = getWeirArcCurve();

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x8a8580,
    roughness: 0.88,
    metalness: 0.04,
    bumpScale: 0.15,
  });

  const lipMat = new THREE.MeshStandardMaterial({
    color: 0xb8b4ae,
    roughness: 0.72,
    metalness: 0.08,
  });

  const lipPts = arc.getPoints(14);
  for (let i = 0; i < lipPts.length - 1; i += 1) {
    const a = lipPts[i];
    const b = lipPts[i + 1];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const len = a.distanceTo(b);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(len + 0.4, 0.35, 2.8), lipMat);
    slab.position.set(mid.x, 10.52, mid.z);
    const angle = Math.atan2(b.z - a.z, b.x - a.x);
    slab.rotation.y = -angle;
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);
  }

  const stepCount = 7;
  for (let i = 0; i < stepCount; i += 1) {
    const t = (i + 1) / (stepCount + 1);
    const along = 5 + t * 22;
    const drop = t * 5.5;
    const p = weir.position.clone().add(weir.outward.clone().multiplyScalar(along));
    p.y = 10.1 - drop;
    const step = new THREE.Mesh(new THREE.BoxGeometry(5.5 + i * 0.6, 0.55, 3.2), concreteMat);
    step.position.copy(p);
    step.lookAt(p.clone().add(weir.outward));
    step.castShadow = true;
    step.receiveShadow = true;
    group.add(step);
  }

  const toe = weir.position.clone().add(weir.outward.clone().multiplyScalar(30));
  toe.y = sampleTerrainHeight(toe.x, toe.z) + 0.25;
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.5, 0.5, 20), concreteMat);
  basin.position.copy(toe);
  basin.receiveShadow = true;
  group.add(basin);

  const wingL = new THREE.Mesh(new THREE.BoxGeometry(12, 0.45, 1.2), concreteMat);
  const wingR = wingL.clone();
  const crest = weir.position.clone();
  crest.y = 10.35;
  wingL.position.copy(crest).add(weir.tangent.clone().multiplyScalar(-7));
  wingR.position.copy(crest).add(weir.tangent.clone().multiplyScalar(7));
  wingL.lookAt(crest.clone().add(weir.outward));
  wingR.lookAt(crest.clone().add(weir.outward));
  group.add(wingL, wingR);

  scene.add(group);

  return {
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
