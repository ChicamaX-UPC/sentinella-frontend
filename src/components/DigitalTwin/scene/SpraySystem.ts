import * as THREE from "three";

export type SpraySystem = {
  update: (
    impactPoint: THREE.Vector3,
    channelPoints: THREE.Vector3[],
    spillSeverity: number,
    spillFlowM3s: number,
    active: boolean,
    time: number
  ) => void;
  dispose: () => void;
};

function createSoftSprite(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, "rgba(255,255,255,0.95)");
  grd.addColorStop(0.35, "rgba(220,230,240,0.55)");
  grd.addColorStop(1, "rgba(200,210,220,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const sprayVertexShader = `
  attribute float seed;
  attribute float phase;
  attribute float kind;
  uniform float time;
  uniform float intensity;
  uniform vec3 impactPoint;
  uniform float channelCount;
  varying float vAlpha;
  varying float vKind;

  vec3 channelPoint(float idx) {
    float a = idx * 2.39996;
    return impactPoint + vec3(cos(a) * idx * 1.8, 0.0, sin(a) * idx * 1.2);
  }

  void main() {
    vKind = kind;
    float life = fract(phase * 0.01 + time * (0.35 + kind * 0.25));
    float age = life;

    vec3 origin = impactPoint;
    if (kind > 0.5 && kind < 1.5) {
      origin = channelPoint(mod(seed * channelCount, max(channelCount, 1.0)));
      origin.y += 0.4;
    } else if (kind >= 1.5) {
      origin = impactPoint + vec3(sin(seed * 6.28) * 2.0, 0.5, cos(seed * 6.28) * 2.0);
    }

    float t = age;
    vec3 vel;
    if (kind < 0.5) {
      vel = vec3(sin(seed * 6.28) * 1.2, 2.0 + seed * 3.0, cos(seed * 6.28) * 1.2);
    } else if (kind < 1.5) {
      vel = vec3(sin(seed * 6.28) * 0.3, -0.8 - seed * 0.6, cos(seed * 6.28) * 0.3);
    } else {
      vel = vec3(0.0, 0.4 + seed * 0.3, 0.0);
    }

    vec3 pos = origin + vel * t - vec3(0.0, 4.9 * t * t, 0.0);

    float heightAbove = pos.y - origin.y;
    float heightFade = 1.0 - smoothstep(4.0, 6.0, heightAbove);
    vAlpha = (1.0 - age) * intensity * heightFade * (kind < 1.5 ? 1.0 : 0.35);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float sz = kind < 0.5 ? 1.5 + seed * 2.5 : kind < 1.5 ? 1.2 + seed * 1.0 : 3.0 + seed * 2.5;
    gl_PointSize = clamp(sz * (260.0 / -mvPosition.z), 2.0, 56.0);
  }
`;

const sprayFragmentShader = `
  uniform sampler2D sprite;
  varying float vAlpha;
  varying float vKind;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.1, d);
    vec4 tex = texture2D(sprite, gl_PointCoord);
    float alpha = soft * vAlpha * tex.a;
    vec3 color = vKind < 1.5 ? vec3(0.85, 0.9, 0.95) : vec3(0.92, 0.94, 0.98);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function createSpraySystem(scene: THREE.Scene, isMobile: boolean): SpraySystem {
  const count = isMobile ? 300 : 1200;
  const seeds = new Float32Array(count);
  const phases = new Float32Array(count);
  const kinds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    seeds[i] = Math.random();
    phases[i] = Math.random() * 100;
    const r = Math.random();
    kinds[i] = r < 0.35 ? 0 : r < 0.75 ? 1 : 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
  geo.setAttribute("kind", new THREE.BufferAttribute(kinds, 1));

  const sprite = createSoftSprite();
  const uniforms = {
    time: { value: 0 },
    intensity: { value: 0 },
    impactPoint: { value: new THREE.Vector3() },
    channelCount: { value: 12 },
    sprite: { value: sprite },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: sprayVertexShader,
    fragmentShader: sprayFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 14;
  points.visible = false;
  scene.add(points);

  return {
    update: (impactPoint, channelPoints, spillSeverity, spillFlowM3s, active, time) => {
      points.visible = active;
      if (!active) {
        uniforms.intensity.value = 0;
        return;
      }
      uniforms.time.value = time;
      uniforms.impactPoint.value.copy(impactPoint);
      uniforms.channelCount.value = Math.max(channelPoints.length, 4);
      uniforms.intensity.value = THREE.MathUtils.clamp(
        spillSeverity * 0.85 + spillFlowM3s * 0.25,
        0.15,
        1
      );
    },
    dispose: () => {
      scene.remove(points);
      geo.dispose();
      mat.dispose();
      sprite.dispose();
    },
  };
}
