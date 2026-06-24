import * as THREE from "three";
import { MIN_FREEBOARD_M } from "@/components/DigitalTwin/constants";

export type TailingsWaterUniforms = {
  time: number;
  freeboard: number;
  spillSeverity: number;
  weirBoost?: number;
};

const vertexShader = `
  uniform float time;
  uniform float spillSeverity;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vDist;
  varying float vFoam;

  void main() {
    vec3 pos = position;
    float ripple =
      sin(pos.x * 0.05 + time * 1.2) * 0.035 +
      cos(pos.z * 0.055 + time * 1.0) * 0.03 +
      sin((pos.x + pos.z) * 0.035 + time * 2.8) * (0.04 + spillSeverity * 0.05);
    pos.y += ripple;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vDist = length(pos.xz);
    vFoam = spillSeverity;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  uniform float freeboard;
  uniform float spillSeverity;
  uniform float weirBoost;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vDist;
  varying float vFoam;

  void main() {
    // Relave espeso: gris-café turbio (TSF en operación).
    vec3 deepMud = vec3(0.30, 0.28, 0.24);
    vec3 midMud = vec3(0.42, 0.39, 0.34);
    vec3 shallow = vec3(0.48, 0.45, 0.40);

    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.4);

    float lowBoard = freeboard > 0.0 && freeboard < ${MIN_FREEBOARD_M.toFixed(1)} ? 1.0 - freeboard : 0.0;
    float spill = max(spillSeverity, vFoam);

    float flowNoise = sin(vWorldPosition.x * 0.12 + time * 2.2) * cos(vWorldPosition.z * 0.1 + time * 1.8) * 0.5 + 0.5;
    float foamNoise = sin(vWorldPosition.x * 0.28 + time * 3.5) * cos(vWorldPosition.z * 0.25 + time * 2.8);

    float foamMask = clamp(lowBoard * 0.35 + spill * 0.85 + weirBoost * 0.7 + foamNoise * 0.12, 0.0, 0.55);
    vec3 foamColor = vec3(0.62, 0.60, 0.56);

    float depthMix = clamp(vDist * 0.008, 0.0, 1.0);
    vec3 waterColor = mix(shallow, mix(midMud, deepMud, depthMix), 0.55 + spill * 0.25);
    waterColor = mix(waterColor, midMud * 0.9, flowNoise * spill * 0.15);

    vec3 color = mix(waterColor, foamColor, foamMask);
    color += fresnel * vec3(0.04, 0.045, 0.04) * 0.35;

    float alpha = 0.94;
    gl_FragColor = vec4(color, alpha);
  }
`;

export type TailingsWaterShaderBundle = {
  uniforms: {
    time: { value: number };
    freeboard: { value: number };
    spillSeverity: { value: number };
    weirBoost: { value: number };
  };
  createMaterial: () => THREE.ShaderMaterial;
  update: (state: TailingsWaterUniforms) => void;
  dispose: () => void;
};

export function createTailingsWaterShaderBundle(): TailingsWaterShaderBundle {
  const uniforms = {
    time: { value: 0 },
    freeboard: { value: 6 },
    spillSeverity: { value: 0 },
    weirBoost: { value: 0 },
  };

  const materials: THREE.ShaderMaterial[] = [];

  const createMaterial = () => {
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
    materials.push(material);
    return material;
  };

  return {
    uniforms,
    createMaterial,
    update: (state) => {
      uniforms.time.value = state.time;
      uniforms.freeboard.value = state.freeboard;
      uniforms.spillSeverity.value = state.spillSeverity;
      uniforms.weirBoost.value = state.weirBoost ?? 0;
    },
    dispose: () => {
      materials.forEach((m) => m.dispose());
      materials.length = 0;
    },
  };
}
