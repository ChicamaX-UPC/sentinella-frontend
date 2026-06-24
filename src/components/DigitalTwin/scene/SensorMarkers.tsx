import * as THREE from "three";
import { SEEPAGE_CRITICAL_L_MIN } from "@/components/DigitalTwin/constants";
import { SENSOR_POSITIONS } from "@/components/DigitalTwin/sensorPositions";
import { sampleTerrainHeight } from "@/components/DigitalTwin/terrainHeight";
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

export type SensorMarkerVisualState = {
  seepageLocation: string;
  seepageFlow: number;
  affectedSensors: string[];
  time: number;
};

export type SensorMarkerSystem = {
  meshes: THREE.Mesh[];
  update: (state: SensorMarkerVisualState) => void;
  handleClick: (raycaster: THREE.Raycaster, mouse: THREE.Vector2, camera: THREE.Camera) => SelectedSensor | null;
  dispose: () => void;
};

const SEEPAGE_PI: Record<string, string> = {
  "Talud Sur (PI-01)": "PI-01",
  "Base Central (PI-03)": "PI-03",
  "Talud Norte (PI-05)": "PI-05",
};

function blueprintY(pos: (typeof SENSOR_POSITIONS)[number]): number {
  if (pos.type === "water_level" || pos.type === "inclination") {
    return pos.y;
  }
  return Math.max(pos.y, sampleTerrainHeight(pos.x, pos.z) + 0.8);
}

function matchBlueprintId(node: TwinNode): string | undefined {
  const hay = `${node.externalId ?? ""} ${node.name ?? ""} ${node.id}`.toUpperCase();
  const hit = SENSOR_POSITIONS.find((p) => hay.includes(p.nodeId));
  return hit?.nodeId;
}

function resolveReading(nodeId: string, externalId?: string, blueprintId?: string) {
  const readings = useSensorStore.getState().lastByNode;
  if (readings[nodeId]) return readings[nodeId];
  if (externalId && readings[externalId]) return readings[externalId];
  if (blueprintId && readings[blueprintId]) return readings[blueprintId];
  return undefined;
}

function findApiNode(blueprintId: string, nodes: TwinNode[]): TwinNode | undefined {
  return nodes.find((n) => matchBlueprintId(n) === blueprintId);
}

export function createSensorMarkerSystem(scene: THREE.Scene, nodes: TwinNode[]): SensorMarkerSystem {
  const sphereGeometry = new THREE.SphereGeometry(1.6, 16, 16);
  const stemGeometry = new THREE.CylinderGeometry(0.12, 0.18, 2.4, 8);
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.35, roughness: 0.55 });
  const markerMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x065f46,
    emissiveIntensity: 1.1,
    roughness: 0.25,
    metalness: 0.15,
  });

  const meshes: THREE.Mesh[] = [];
  const glows: THREE.PointLight[] = [];
  const stems: THREE.Mesh[] = [];
  const clickTargets: THREE.Object3D[] = [];

  for (const pos of SENSOR_POSITIONS) {
    const apiNode = findApiNode(pos.nodeId, nodes);
    const y = blueprintY(pos);

    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.set(pos.x, y - 1.2, pos.z);
    stem.castShadow = true;

    const mesh = new THREE.Mesh(sphereGeometry, markerMaterial.clone());
    mesh.position.set(pos.x, y, pos.z);
    mesh.castShadow = true;
    mesh.renderOrder = 12;

    const glow = new THREE.PointLight(0x00ff88, 1.4, 28, 2);
    glow.position.set(pos.x, y, pos.z);

    mesh.userData = {
      nodeId: apiNode?.id ?? pos.nodeId,
      externalId: apiNode?.externalId ?? pos.nodeId,
      blueprintId: pos.nodeId,
      name: apiNode?.name ?? pos.label,
    };

    meshes.push(mesh);
    glows.push(glow);
    stems.push(stem);
    clickTargets.push(mesh);
    scene.add(stem);
    scene.add(mesh);
    scene.add(glow);
  }

  return {
    meshes,
    update: (state) => {
      const seepagePi = SEEPAGE_PI[state.seepageLocation];
      const seepageActive = state.seepageFlow >= 5;
      const seepageCritical = state.seepageFlow >= SEEPAGE_CRITICAL_L_MIN;
      const affected = new Set(state.affectedSensors);

      for (let i = 0; i < meshes.length; i += 1) {
        const mesh = meshes[i];
        const glow = glows[i];
        const blueprintId = String(mesh.userData.blueprintId ?? "");
        const reading = resolveReading(
          String(mesh.userData.nodeId),
          String(mesh.userData.externalId ?? ""),
          blueprintId
        );
        const status = String(reading?.status ?? "OK").toUpperCase();
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const pulse = 1 + Math.sin(state.time * 3.2 + i * 0.4) * 0.18;
        const highlightSeepage = seepageActive && blueprintId === seepagePi;
        const highlightScenario = affected.has(blueprintId);

        if (highlightSeepage || (seepageCritical && blueprintId.startsWith("PI-"))) {
          mat.color.set(seepageCritical ? 0x38bdf8 : 0x60a5fa);
          mat.emissive.set(seepageCritical ? 0x0c4a6e : 0x1e40af);
          mat.emissiveIntensity = seepageCritical ? 1.8 * pulse : 1.3;
          glow.color.set(0x38bdf8);
          glow.intensity = 2.8 * pulse;
          mesh.scale.setScalar(1.08 + (seepageCritical ? 0.12 : 0.05));
          continue;
        }

        mesh.scale.setScalar(highlightScenario ? 1.1 : 1);

        if (status.includes("CRITICAL")) {
          mat.color.set(0xff3333);
          mat.emissive.set(0x7f1d1d);
          mat.emissiveIntensity = 1.6;
          glow.color.set(0xff3333);
          glow.intensity = 2.4 * pulse;
          continue;
        }
        if (status.includes("WARNING")) {
          mat.color.set(0xffb800);
          mat.emissive.set(0x78350f);
          mat.emissiveIntensity = 1.3;
          glow.color.set(0xffb800);
          glow.intensity = 2.0 * pulse;
          continue;
        }
        mat.color.set(highlightScenario ? 0x34d399 : 0x00ff88);
        mat.emissive.set(0x065f46);
        mat.emissiveIntensity = highlightScenario ? 1.3 : 1.1;
        glow.color.set(0x00ff88);
        glow.intensity = highlightScenario ? 1.8 : 1.4;
      }
    },
    handleClick: (raycaster, mouse, camera) => {
      raycaster.setFromCamera(mouse, camera);
      const hit = raycaster.intersectObjects(clickTargets, false)[0];
      if (!hit) {
        return null;
      }
      const nodeId = String(hit.object.userData.nodeId);
      const externalId = String(hit.object.userData.externalId ?? "");
      const blueprintId = String(hit.object.userData.blueprintId ?? "");
      const reading = resolveReading(nodeId, externalId, blueprintId);
      return {
        nodeId,
        name: String(hit.object.userData.name ?? nodeId),
        status: String(reading?.status ?? "OK"),
        value: reading?.value,
        unit: reading?.unit,
      };
    },
    dispose: () => {
      stems.forEach((stem) => {
        scene.remove(stem);
      });
      meshes.forEach((mesh) => {
        scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
      });
      glows.forEach((light) => scene.remove(light));
      sphereGeometry.dispose();
      stemGeometry.dispose();
      stemMaterial.dispose();
      markerMaterial.dispose();
    },
  };
}
