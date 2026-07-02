import * as THREE from "three";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { SENSOR_POSITIONS } from "@/components/DigitalTwin/sensorPositions";
import { sampleTerrainHeight } from "@/components/DigitalTwin/terrainHeight";
import { useSensorStore } from "@/stores/useSensorStore";

type TwinNode = {
  id: string;
  externalId?: string;
  name: string;
};

/** Lectura simulada mínima que el motor entrega por blueprintId. */
export type LabelReading = {
  value: number;
  unit: string;
  status: string;
};

export type SensorLabelSystem = {
  setVisible: (visible: boolean) => void;
  setSize: (width: number, height: number) => void;
  update: (simReadings?: ReadonlyMap<string, LabelReading> | null) => void;
  render: (scene: THREE.Scene, camera: THREE.Camera) => void;
  dispose: () => void;
  domElement: HTMLElement;
};

function blueprintY(pos: (typeof SENSOR_POSITIONS)[number]): number {
  if (pos.type === "water_level" || pos.type === "inclination") {
    return pos.y;
  }
  return Math.max(pos.y, sampleTerrainHeight(pos.x, pos.z) + 0.8);
}

function resolveReading(nodeId: string) {
  return useSensorStore.getState().lastByNode[nodeId];
}

function statusClass(status: string): string {
  const s = status.toUpperCase();
  if (s.includes("CRITICAL")) return "twin-sensor-label--critical";
  if (s.includes("WARNING")) return "twin-sensor-label--warning";
  return "twin-sensor-label--ok";
}

export function createSensorLabelSystem(nodes: TwinNode[]): SensorLabelSystem {
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.pointerEvents = "none";

  const labels: CSS2DObject[] = [];
  const group = new THREE.Group();

  for (const pos of SENSOR_POSITIONS) {
    const apiNode = nodes.find((n) => {
      const hay = `${n.externalId ?? ""} ${n.name ?? ""} ${n.id}`.toUpperCase();
      return hay.includes(pos.nodeId);
    });
    const nodeId = apiNode?.id ?? pos.nodeId;

    const el = document.createElement("div");
    el.className = "twin-sensor-label";
    el.innerHTML = `<strong>${pos.nodeId}</strong><span class="twin-sensor-label__value">—</span>`;

    const label = new CSS2DObject(el);
    label.position.set(pos.x, blueprintY(pos) + 2.8, pos.z);
    label.userData = { nodeId, blueprintId: pos.nodeId };
    labels.push(label);
    group.add(label);
  }

  let visible = true;

  return {
    domElement: labelRenderer.domElement,
    setVisible: (v) => {
      visible = v;
      labels.forEach((l) => {
        l.visible = v;
      });
    },
    setSize: (width, height) => {
      labelRenderer.setSize(width, height);
    },
    update: (simReadings) => {
      if (!visible) return;
      for (const label of labels) {
        const blueprintId = String(label.userData.blueprintId);
        const nodeId = String(label.userData.nodeId);
        // En simulación mandan las lecturas sintéticas; en vivo, el sensor store (WS).
        const sim = simReadings?.get(blueprintId);
        const reading = sim ?? resolveReading(nodeId) ?? resolveReading(blueprintId);
        const el = label.element as HTMLDivElement;
        const value = reading?.value;
        const unit = reading?.unit ?? "";
        const status = String(reading?.status ?? "OK");
        el.className = `twin-sensor-label ${statusClass(status)}`;
        const valueEl = el.querySelector(".twin-sensor-label__value");
        if (valueEl) {
          valueEl.textContent =
            value !== undefined ? `${value.toFixed(1)} ${unit}`.trim() : status;
        }
      }
    },
    render: (scene, camera) => {
      if (!group.parent) {
        scene.add(group);
      }
      if (visible) {
        labelRenderer.render(scene, camera);
      }
    },
    dispose: () => {
      group.removeFromParent();
      labels.forEach((l) => l.element.remove());
      labelRenderer.domElement.remove();
    },
  };
}
