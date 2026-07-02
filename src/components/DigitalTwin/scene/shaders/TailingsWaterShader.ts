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
      sin(pos.x * 0.08 + time * 1.4) * 0.022 +
      cos(pos.z * 0.09 + time * 1.1) * 0.018 +
      sin((pos.x + pos.z) * 0.05 + time * 2.2) * (0.015 + spillSeverity * 0.03);
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
    vec3 processWater = vec3(0.38, 0.52, 0.50);
    vec3 deepWater = vec3(0.28, 0.42, 0.44);
    vec3 shoreMud = vec3(0.48, 0.40, 0.32);
    vec3 dryBeach = vec3(0.58, 0.50, 0.40);

    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.8);

    float radial = clamp(vDist * 0.012, 0.0, 1.0);
    vec3 waterColor = mix(processWater, deepWater, radial * 0.55);
    waterColor = mix(waterColor, shoreMud, smoothstep(0.55, 0.95, radial));

    float lowBoard = freeboard > 0.0 && freeboard < ${MIN_FREEBOARD_M.toFixed(1)} ? 1.0 - freeboard : 0.0;
    float spill = max(spillSeverity, vFoam);

    float wave = sin(vWorldPosition.x * 0.15 + time * 2.0) * cos(vWorldPosition.z * 0.12 + time * 1.6) * 0.5 + 0.5;
    float foamNoise = sin(vWorldPosition.x * 0.22 + time * 2.8) * cos(vWorldPosition.z * 0.2 + time * 2.2);

    float foamMask = clamp(lowBoard * 0.3 + spill * 0.5 + weirBoost * 0.45 + foamNoise * 0.08, 0.0, 0.45);
    vec3 foamColor = vec3(0.52, 0.50, 0.46);

    vec3 sunDir = normalize(vec3(0.55, 0.38, 0.25));
    vec3 halfDir = normalize(sunDir + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0) * 0.35;
    spec += pow(max(dot(vNormal, halfDir), 0.0), 8.0) * wave * 0.12;

    vec3 color = mix(waterColor, foamColor, foamMask);
    color += fresnel * vec3(0.06, 0.08, 0.07) * 0.4;
    color += vec3(spec) * vec3(1.0, 0.95, 0.85);

    float alpha = 0.90 + fresnel * 0.06;
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
