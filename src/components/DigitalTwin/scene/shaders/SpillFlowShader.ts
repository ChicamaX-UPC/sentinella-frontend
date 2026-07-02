import * as THREE from "three";

export type SpillFlowUniforms = {
  time: number;
  flowSpeed: number;
  spillSeverity: number;
  foamBoost: number;
};

const vertexShader = `
  uniform float time;
  uniform float flowSpeed;
  uniform float spillSeverity;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vAlong;
  varying float vEdge;

  void main() {
    vec3 pos = position;
    float ripple = sin(pos.x * 0.18 + time * (2.0 + flowSpeed * 4.0)) * 0.04 * spillSeverity;
    ripple += cos(pos.z * 0.22 + time * (1.6 + flowSpeed * 3.0)) * 0.03 * spillSeverity;
    pos.y += ripple;

    vUv = uv;
    vAlong = uv.x;
    vEdge = abs(uv.y - 0.5) * 2.0;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  uniform float flowSpeed;
  uniform float spillSeverity;
  uniform float foamBoost;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vAlong;
  varying float vEdge;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 deep = vec3(0.18, 0.32, 0.36);
    vec3 mid = vec3(0.28, 0.46, 0.50);
    vec3 shallow = vec3(0.42, 0.58, 0.60);

    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.0);

    float scroll = time * (1.0 + flowSpeed * 3.0);
    vec2 flowUv = vec2(vAlong * 8.0 - scroll, vUv.y * 4.0);
    float n1 = noise(flowUv);
    float n2 = noise(flowUv * 2.1 + vec2(scroll * 0.35, 0.0));
    float flow = n1 * 0.6 + n2 * 0.4;

    float edgeFoam = smoothstep(0.45, 0.92, vEdge) * (0.45 + spillSeverity * 0.55 + foamBoost);
    float streakFoam = smoothstep(0.35, 0.8, flow) * (0.3 + spillSeverity * 0.45);
    float foamMask = clamp(edgeFoam + streakFoam + foamBoost * 0.45, 0.0, 0.85);
    vec3 foamColor = vec3(0.88, 0.92, 0.94);

    vec3 waterColor = mix(shallow, mid, 0.35 + spillSeverity * 0.3);
    waterColor = mix(waterColor, deep, flow * 0.2 * spillSeverity);
    waterColor += vec3(0.06, 0.08, 0.07) * fresnel;

    vec3 color = mix(waterColor, foamColor, foamMask);
    float alpha = clamp(0.92 + spillSeverity * 0.06, 0.85, 1.0);
    gl_FragColor = vec4(color, alpha);
  }
`;

export type SpillFlowShaderBundle = {
  uniforms: {
    time: { value: number };
    flowSpeed: { value: number };
    spillSeverity: { value: number };
    foamBoost: { value: number };
  };
  createMaterial: () => THREE.ShaderMaterial;
  update: (state: SpillFlowUniforms) => void;
  dispose: () => void;
};

export function createSpillFlowShaderBundle(): SpillFlowShaderBundle {
  const uniforms = {
    time: { value: 0 },
    flowSpeed: { value: 0 },
    spillSeverity: { value: 0 },
    foamBoost: { value: 0 },
  };

  const materials: THREE.ShaderMaterial[] = [];

  const createMaterial = () => {
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    materials.push(material);
    return material;
  };

  return {
    uniforms,
    createMaterial,
    update: (state) => {
      uniforms.time.value = state.time;
      uniforms.flowSpeed.value = state.flowSpeed;
      uniforms.spillSeverity.value = state.spillSeverity;
      uniforms.foamBoost.value = state.foamBoost;
    },
    dispose: () => {
      materials.forEach((m) => m.dispose());
      materials.length = 0;
    },
  };
}
