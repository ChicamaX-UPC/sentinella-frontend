import * as THREE from "three";
import { BOWL_CX, BOWL_CZ } from "@/components/DigitalTwin/constants";
import { SENSOR_POSITIONS } from "@/components/DigitalTwin/sensorPositions";
import type { SyntheticReading } from "@/components/DigitalTwin/physics/sensorSimulation";

export type HologramLayerSystem = {
  update: (
    simReadings: Map<string, SyntheticReading> | null,
    surfaceY: number,
    time: number,
    active: boolean
  ) => void;
  dispose: () => void;
};

const STATUS_COLORS: Record<string, THREE.Color> = {
  OK: new THREE.Color(0x22d3ee),
  WARNING: new THREE.Color(0xfbbf24),
  CRITICAL: new THREE.Color(0xef4444),
};

const beamVertexShader = `
  varying vec2 vUv;
  varying float vFade;
  void main() {
    vUv = uv;
    vFade = 1.0 - uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const beamFragmentShader = `
  uniform vec3 beamColor;
  uniform float opacity;
  varying vec2 vUv;
  varying float vFade;
  void main() {
    float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
    float alpha = edge * vFade * opacity * 0.55;
    gl_FragColor = vec4(beamColor, alpha);
  }
`;

function createBeamMaterial(color: THREE.Color): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      beamColor: { value: color.clone() },
      opacity: { value: 1 },
    },
    vertexShader: beamVertexShader,
    fragmentShader: beamFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function createRingMaterial(color: THREE.Color): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

export function createHologramLayerSystem(scene: THREE.Scene): HologramLayerSystem {
  const group = new THREE.Group();

  type SensorFx = {
    nodeId: string;
    beam: THREE.Mesh;
    beamMat: THREE.ShaderMaterial;
    ring: THREE.Mesh;
    ringMat: THREE.MeshBasicMaterial;
    phase: number;
  };

  const sensors: SensorFx[] = SENSOR_POSITIONS.map((pos, i) => {
    const color = STATUS_COLORS.OK;
    const beamMat = createBeamMaterial(color);
    const beamHeight = 18 + (pos.type === "pluviometer" ? 8 : 0);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.8, beamHeight, 8, 1, true), beamMat);
    beam.position.set(pos.x, pos.y + beamHeight * 0.5, pos.z);
    beam.renderOrder = 20;
    group.add(beam);

    const ringMat = createRingMaterial(color);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.2, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, pos.y + 0.08, pos.z);
    ring.renderOrder = 19;
    group.add(ring);

    return { nodeId: pos.nodeId, beam, beamMat, ring, ringMat, phase: i * 0.7 };
  });

  const radarMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const radarRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 2.5, 64), radarMat);
  radarRing.rotation.x = -Math.PI / 2;
  radarRing.position.set(BOWL_CX, 0.5, BOWL_CZ);
  radarRing.renderOrder = 18;
  group.add(radarRing);

  const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      time: { value: 0 },
      surfaceY: { value: 5 },
    },
    vertexShader: `
      varying vec2 vWorldXZ;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldXZ = wp.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vWorldXZ;
      void main() {
        vec2 g = vWorldXZ * 0.08;
        vec2 grid = abs(fract(g - 0.5) - 0.5) / fwidth(g);
        float line = 1.0 - min(min(grid.x, grid.y), 1.0);
        float scan = sin(length(vWorldXZ - vec2(${BOWL_CX.toFixed(1)}, ${BOWL_CZ.toFixed(1)})) * 0.06 - time * 1.2) * 0.5 + 0.5;
        float alpha = line * 0.06 + scan * 0.03;
        gl_FragColor = vec4(0.13, 0.83, 0.93, alpha);
      }
    `,
  });
  const waterGrid = new THREE.Mesh(new THREE.PlaneGeometry(280, 220, 1, 1), gridMat);
  waterGrid.rotation.x = -Math.PI / 2;
  waterGrid.position.set(BOWL_CX, 5, BOWL_CZ);
  waterGrid.renderOrder = 5;
  group.add(waterGrid);

  scene.add(group);

  const setSensorColor = (fx: SensorFx, status: string) => {
    const c = STATUS_COLORS[status] ?? STATUS_COLORS.OK;
    (fx.beamMat.uniforms.beamColor as { value: THREE.Color }).value.copy(c);
    fx.ringMat.color.copy(c);
  };

  return {
    update: (simReadings, surfaceY, time, active) => {
      group.visible = active;
      if (!active) return;

      waterGrid.position.y = surfaceY + 0.04;
      (gridMat.uniforms.time as { value: number }).value = time;
      (gridMat.uniforms.surfaceY as { value: number }).value = surfaceY;

      const radarPhase = (time % 6) / 6;
      const radarScale = 5 + radarPhase * 120;
      radarRing.scale.setScalar(radarScale);
      radarMat.opacity = 0.18 * (1 - radarPhase);
      radarRing.position.y = surfaceY + 0.02;

      for (const fx of sensors) {
        const reading = simReadings?.get(fx.nodeId);
        const status = reading?.status ?? "OK";
        setSensorColor(fx, status);

        const pulse = (time + fx.phase) % 2;
        const ringScale = 1 + pulse * 1.8;
        fx.ring.scale.setScalar(ringScale);
        fx.ringMat.opacity = 0.55 * (1 - pulse * 0.85);

        const beamOpacity = status === "CRITICAL" ? 1.2 : status === "WARNING" ? 0.9 : 0.65;
        (fx.beamMat.uniforms.opacity as { value: number }).value =
          beamOpacity + Math.sin(time * 3 + fx.phase) * 0.08;
      }
    },
    dispose: () => {
      scene.remove(group);
      sensors.forEach((fx) => {
        fx.beam.geometry.dispose();
        fx.beamMat.dispose();
        fx.ring.geometry.dispose();
        fx.ringMat.dispose();
      });
      radarRing.geometry.dispose();
      radarMat.dispose();
      waterGrid.geometry.dispose();
      gridMat.dispose();
    },
  };
}
