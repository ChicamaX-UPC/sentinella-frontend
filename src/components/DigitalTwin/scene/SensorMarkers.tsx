import * as THREE from "three";
import { SENSOR_POSITIONS } from "@/components/DigitalTwin/sensorPositions";
import { useSensorStore } from "@/stores/useSensorStore";

type TwinNode = {
  id: string;
  externalId?: string;
  name: string;
  sensorType?: string;
  status?: string;
};

export type SelectedSensor = {
  nodeId: string;
  name: string;
  status: string;
  value?: number;
  unit?: string;
};

export type SensorMarkerSystem = {
  meshes: THREE.Mesh[];
  update: (time: number) => void;
  handleClick: (raycaster: THREE.Raycaster, mouse: THREE.Vector2, camera: THREE.Camera) => SelectedSensor | null;
  dispose: () => void;
};

type PositionedNode = {
  node: TwinNode;
  x: number;
  y: number;
  z: number;
};

function resolveReading(nodeId: string, externalId?: string) {
  const readings = useSensorStore.getState().lastByNode;
  if (readings[nodeId]) {
    return readings[nodeId];
  }
  if (externalId && readings[externalId]) {
    return readings[externalId];
  }
  return undefined;
}

function positionNode(node: TwinNode, index: number, total: number): PositionedNode {
  const byExternal = SENSOR_POSITIONS.find((p) => p.nodeId === node.externalId);
  if (byExternal) {
    return { node, x: byExternal.x, y: byExternal.y, z: byExternal.z };
  }
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  return {
    node,
    x: Math.cos(angle) * 46,
    y: 9 + (index % 3),
    z: Math.sin(angle) * 46,
  };
}

export function createSensorMarkerSystem(scene: THREE.Scene, nodes: TwinNode[]): SensorMarkerSystem {
  const sphereGeometry = new THREE.SphereGeometry(2.2, 18, 18);
  const markerMaterial = new THREE.MeshStandardMaterial({
    color: 0x14b8a6,
    emissive: 0x042f2e,
    emissiveIntensity: 0.65,
    roughness: 0.28,
    metalness: 0.1,
  });
  const meshes: THREE.Mesh[] = [];
  const glows: THREE.PointLight[] = [];

  const positioned = nodes.map((node, i) => positionNode(node, i, nodes.length));

  for (const item of positioned) {
    const mesh = new THREE.Mesh(sphereGeometry, markerMaterial.clone());
    mesh.position.set(item.x, item.y, item.z);
    mesh.castShadow = true;
    const glow = new THREE.PointLight(0x14b8a6, 1.3, 20, 2);
    glow.position.set(item.x, item.y, item.z);
    glow.userData.nodeId = item.node.id;

    mesh.userData = { nodeId: item.node.id, externalId: item.node.externalId, name: item.node.name };
    meshes.push(mesh);
    glows.push(glow);
    scene.add(mesh);
    scene.add(glow);
  }

  return {
    meshes,
    update: (time) => {
      for (let i = 0; i < meshes.length; i += 1) {
        const mesh = meshes[i];
        const glow = glows[i];
        const reading = resolveReading(String(mesh.userData.nodeId), String(mesh.userData.externalId ?? ""));
        const status = String(reading?.status ?? "OK").toUpperCase();
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const pulse = 1 + Math.sin(time * 3.2 + i * 0.4) * 0.24;

        if (status.includes("CRITICAL")) {
          mat.color.set(0xef4444);
          mat.emissive.set(0x7f1d1d);
          mat.emissiveIntensity = 1.4;
          glow.color.set(0xef4444);
          glow.intensity = 2.4 * pulse;
          continue;
        }
        if (status.includes("WARNING")) {
          mat.color.set(0xf59e0b);
          mat.emissive.set(0x78350f);
          mat.emissiveIntensity = 1.1;
          glow.color.set(0xf59e0b);
          glow.intensity = 1.9 * pulse;
          continue;
        }
        mat.color.set(0x00ff88);
        mat.emissive.set(0x065f46);
        mat.emissiveIntensity = 0.9;
        glow.color.set(0x00ff88);
        glow.intensity = 1.3;
      }
    },
    handleClick: (raycaster, mouse, camera) => {
      raycaster.setFromCamera(mouse, camera);
      const hit = raycaster.intersectObjects(meshes, false)[0];
      if (!hit) {
        return null;
      }
      const nodeId = String(hit.object.userData.nodeId);
      const externalId = String(hit.object.userData.externalId ?? "");
      const reading = resolveReading(nodeId, externalId);
      return {
        nodeId,
        name: String(hit.object.userData.name ?? nodeId),
        status: String(reading?.status ?? "OK"),
        value: reading?.value,
        unit: reading?.unit,
      };
    },
    dispose: () => {
      meshes.forEach((mesh) => {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      glows.forEach((light) => {
        scene.remove(light);
      });
      sphereGeometry.dispose();
      markerMaterial.dispose();
    },
  };
}
