import * as THREE from "three";
import { sampleTerrainHeight } from "@/components/DigitalTwin/terrainHeight";
import { getWeirOutlet } from "./DamGeometry";
import type { TailingsWaterShaderBundle } from "./shaders/TailingsWaterShader";

export type FlowRibbonSystem = {
  update: (surfaceY: number, spillSeverity: number, active: boolean) => void;
  dispose: () => void;
};

function buildFlowPath(surfaceY: number, severity: number): THREE.CatmullRomCurve3 {
  const weir = getWeirOutlet();
  const start = weir.position.clone();
  start.y = surfaceY + 0.12;
  start.add(weir.outward.clone().multiplyScalar(5 + severity * 4));

  const points: THREE.Vector3[] = [start];
  const steps = 14;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const along = 8 + t * (28 + severity * 14);
    const p = weir.position.clone().add(weir.outward.clone().multiplyScalar(along));
    p.y = sampleTerrainHeight(p.x, p.z) + 0.22 + (1 - t) * (surfaceY - sampleTerrainHeight(p.x, p.z)) * 0.15;
    points.push(p);
  }
  return new THREE.CatmullRomCurve3(points);
}

function buildRibbonGeometry(curve: THREE.CatmullRomCurve3, width: number): THREE.BufferGeometry {
  const segments = 32;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const half = width * (0.55 + (1 - t) * 0.45);
    const left = p.clone().add(side.clone().multiplyScalar(half));
    const right = p.clone().add(side.clone().multiplyScalar(-half));
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(t, 0, t, 1);
    if (i < segments) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createFlowRibbonSystem(
  scene: THREE.Scene,
  waterShader: TailingsWaterShaderBundle
): FlowRibbonSystem {
  const group = new THREE.Group();
  const material = waterShader.createMaterial();
  let mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  mesh.renderOrder = 7;
  mesh.visible = false;
  group.add(mesh);
  scene.add(group);

  let lastKey = "";

  return {
    update: (surfaceY, spillSeverity, active) => {
      const key = `${surfaceY.toFixed(2)}_${spillSeverity.toFixed(2)}`;
      if (active && key !== lastKey) {
        lastKey = key;
        const curve = buildFlowPath(surfaceY, spillSeverity);
        const width = 3.5 + spillSeverity * 3.5;
        mesh.geometry.dispose();
        mesh.geometry = buildRibbonGeometry(curve, width);
      }
      mesh.visible = active;
      if (active) {
        waterShader.uniforms.weirBoost.value = Math.max(
          waterShader.uniforms.weirBoost.value,
          0.35 + spillSeverity * 0.55
        );
      }
    },
    dispose: () => {
      scene.remove(group);
      mesh.geometry.dispose();
    },
  };
}
