import * as THREE from "three";

export type WeatherVisualState = {
  rainIntensity: number;
  simulationType: string;
  running: boolean;
};

export type WeatherSystem = {
  update: (state: WeatherVisualState, delta: number, speed: number) => void;
  dispose: () => void;
};

const MAX_DROPS = 1800;

export function createWeatherSystem(scene: THREE.Scene): WeatherSystem {
  const rainGeometry = new THREE.CylinderGeometry(0.03, 0.03, 2.6, 6);
  const rainMaterial = new THREE.MeshBasicMaterial({
    color: 0xb9d9ff,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const rain = new THREE.InstancedMesh(rainGeometry, rainMaterial, MAX_DROPS);
  rain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  rain.visible = false;
  scene.add(rain);

  const positions: THREE.Vector3[] = Array.from({ length: MAX_DROPS }, () => {
    const x = (Math.random() - 0.5) * 760;
    const y = 20 + Math.random() * 130;
    const z = (Math.random() - 0.5) * 760;
    return new THREE.Vector3(x, y, z);
  });

  const tempMatrix = new THREE.Matrix4();
  const tempQuat = new THREE.Quaternion();
  const tempScale = new THREE.Vector3(1, 1, 1);
  let visibleDrops = 0;

  // Cielo diurno base (coherente con TwinCanvas); la lluvia lo oscurece poco a poco.
  const baseBackground = new THREE.Color(0xbdd6e8);
  scene.background = baseBackground.clone();
  // Niebla ligera: densidad baja; sube solo con lluvia fuerte.
  scene.fog = new THREE.FogExp2(0xc9dbe8, 0.00018);

  return {
    update: (state, delta, speed) => {
      const intensity = state.running ? THREE.MathUtils.clamp(state.rainIntensity, 0, 90) : 0;
      const normalized = intensity / 90;

      visibleDrops = Math.floor(MAX_DROPS * normalized);
      rain.visible = visibleDrops > 0;
      rain.count = visibleDrops;

      const fallSpeed = 48 + normalized * 55;
      for (let i = 0; i < visibleDrops; i += 1) {
        const p = positions[i];
        p.y -= fallSpeed * delta * speed;
        p.x += Math.sin(p.z * 0.03 + i) * delta * 1.8;
        p.z += Math.cos(p.x * 0.02 + i) * delta * 0.8;
        if (p.y < -8) {
          p.y = 90 + Math.random() * 80;
          p.x = (Math.random() - 0.5) * 760;
          p.z = (Math.random() - 0.5) * 760;
        }
        tempMatrix.compose(p, tempQuat, tempScale);
        rain.setMatrixAt(i, tempMatrix);
      }
      rain.instanceMatrix.needsUpdate = true;

      const overcast = new THREE.Color(0x6b7c90);
      const nightish = new THREE.Color(0x1e2a3a);
      const lerped = baseBackground
        .clone()
        .lerp(overcast, normalized * 0.5)
        .lerp(nightish, Math.max(0, normalized - 0.5) * 0.4);

      scene.background = lerped;

      const fog = scene.fog as THREE.FogExp2 | null;
      if (fog) {
        fog.color.copy(lerped);
        // Tormenta: algo mas densa, pero sin tapar los cerros.
        fog.density = 0.00018 + normalized * 0.00055;
      }
    },
    dispose: () => {
      scene.remove(rain);
      rainGeometry.dispose();
      rainMaterial.dispose();
      if (scene.fog) {
        scene.fog = null;
      }
    },
  };
}
