import * as THREE from "three";
import { getWeirArcCurve, getWeirOutlet } from "./DamGeometry";
import type { TailingsWaterShaderBundle } from "./shaders/TailingsWaterShader";

export type WeirSpillSurfaceSystem = {
  update: (surfaceY: number, spillM: number, spillSeverity: number, active: boolean, time: number) => void;
  dispose: () => void;
};

/** Relave rebasando la corona solo en el arco del vertedero (aguas abajo). */
export function createWeirSpillSurfaceSystem(
  scene: THREE.Scene,
  waterShader: TailingsWaterShaderBundle
): WeirSpillSurfaceSystem {
  const group = new THREE.Group();
  const weir = getWeirOutlet();
  const arc = getWeirArcCurve();

  const lipMat = waterShader.createMaterial();
  const segments = 16;
  const lipWidth = 3.2;
  const lipVerts: number[] = [];
  const lipIdx: number[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const p = arc.getPoint(t);
    const tan = arc.getTangent(t).normalize();
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const inner = p.clone().add(side.clone().multiplyScalar(-lipWidth * 0.35));
    const outer = p.clone().add(side.clone().multiplyScalar(lipWidth * 0.65));
    inner.y = 10.42;
    outer.y = 10.38;
    lipVerts.push(inner.x, inner.y, inner.z, outer.x, outer.y, outer.z);
    if (i < segments) {
      const b = i * 2;
      lipIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }

  const lipGeo = new THREE.BufferGeometry();
  lipGeo.setAttribute("position", new THREE.Float32BufferAttribute(lipVerts, 3));
  lipGeo.setIndex(lipIdx);
  lipGeo.computeVertexNormals();
  const lipMesh = new THREE.Mesh(lipGeo, lipMat);
  lipMesh.renderOrder = 9;
  lipMesh.visible = false;
  group.add(lipMesh);

  const bulgeMat = waterShader.createMaterial();
  const bulge = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 5), bulgeMat);
  bulge.renderOrder = 10;
  bulge.visible = false;
  group.add(bulge);

  scene.add(group);

  return {
    update: (surfaceY, spillM, spillSeverity, active, time) => {
      lipMesh.visible = active;
      bulge.visible = active;
      if (!active) return;

      const lift = surfaceY - 10.4;
      const pos = lipGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i += 1) {
        const y = pos.getY(i);
        const base = y < 10.4 ? 10.42 : 10.38;
        pos.setY(i, base + lift + (y < 10.4 ? 0.08 : 0));
      }
      pos.needsUpdate = true;
      lipGeo.computeVertexNormals();

      bulge.position.copy(weir.position);
      bulge.position.add(weir.outward.clone().multiplyScalar(4));
      bulge.position.y = surfaceY - 0.15;
      bulge.lookAt(bulge.position.clone().add(weir.outward));
      bulge.scale.set(0.9 + spillSeverity * 0.5, 0.5 + spillM * 0.45, 0.7 + spillSeverity * 0.4);

      waterShader.uniforms.weirBoost.value = Math.max(
        waterShader.uniforms.weirBoost.value,
        0.55 + spillSeverity * 0.4 + Math.sin(time * 5) * 0.05
      );
    },
    dispose: () => {
      scene.remove(group);
      lipGeo.dispose();
      bulge.geometry.dispose();
    },
  };
}
