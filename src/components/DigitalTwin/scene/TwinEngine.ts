import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TWIN_SIMULATIONS } from "@/components/DigitalTwin/simulations";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { createCameraPresetController, type CameraPresetId } from "./CameraPresets";
import { createDrainageSystem } from "./DrainageSystem";
import { createOverflowSystem } from "./OverflowSystem";
import { createSensorLabelSystem } from "./SensorLabels";
import { createSensorMarkerSystem } from "./SensorMarkers";
import { createSimulationEffects, type TwinMetrics } from "./SimulationEffects";
import { createTailingDamSystem } from "./TailingDam";
import { createTerrainSystem } from "./Terrain";
import { createWaterPlaneSystem } from "./WaterPlane";
import { createWeatherSystem } from "./WeatherSystem";
import { createWeirStructureSystem } from "./WeirStructure";

type TwinNode = {
  id: string;
  externalId?: string;
  name: string;
  sensorType?: string;
  status?: string;
};

export type TwinEngineOptions = {
  mount: HTMLElement;
  nodes: TwinNode[];
  isMobile: boolean;
  onMetricsChange?: (metrics: TwinMetrics) => void;
};

export type TwinEngine = {
  focusCamera: (preset: CameraPresetId) => void;
  handleClick: (
    raycaster: THREE.Raycaster,
    mouse: THREE.Vector2
  ) => ReturnType<ReturnType<typeof createSensorMarkerSystem>["handleClick"]>;
  resize: (width: number, height: number) => void;
  dispose: () => void;
  renderer: THREE.WebGLRenderer;
};

function createAridEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new THREE.Scene();
  const skyGeo = new THREE.SphereGeometry(500, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0xb8d4e8) },
      bottomColor: { value: new THREE.Color(0xe8d4b8) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y * 0.5 + 0.5;
        gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
      }
    `,
  });
  envScene.add(new THREE.Mesh(skyGeo, skyMat));
  const envMap = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  skyGeo.dispose();
  skyMat.dispose();
  scene.environment = envMap;
  return envMap;
}

export function createTwinEngine(options: TwinEngineOptions): TwinEngine {
  const { mount, nodes, isMobile, onMetricsChange } = options;
  const width = mount.clientWidth || 800;
  const height = mount.clientHeight || 520;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc5d8e8);
  scene.fog = new THREE.Fog(0xd4e4f0, 280, 2200);

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1400);
  camera.position.set(170, 88, 178);

  const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: "high-performance" });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  mount.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 8, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxDistance = 520;
  controls.minDistance = 55;

  const envMap = createAridEnvironment(scene, renderer);

  scene.add(new THREE.AmbientLight(0xfff4e8, 0.38));
  scene.add(new THREE.HemisphereLight(0xdce8f4, 0xa88a62, 0.42));
  const dir = new THREE.DirectionalLight(0xffe8c8, 1.45);
  dir.position.set(120, 175, 95);
  dir.castShadow = true;
  dir.shadow.mapSize.set(isMobile ? 512 : 1024, isMobile ? 512 : 1024);
  dir.shadow.camera.near = 0.1;
  dir.shadow.camera.far = 380;
  dir.shadow.camera.left = -180;
  dir.shadow.camera.right = 180;
  dir.shadow.camera.top = 180;
  dir.shadow.camera.bottom = -180;
  scene.add(dir);

  const terrainSystem = createTerrainSystem(scene);
  const damSystem = createTailingDamSystem(scene);
  const waterSystem = createWaterPlaneSystem(scene, damSystem.basinRadius);
  const overflowSystem = createOverflowSystem(scene);
  const weirStructure = createWeirStructureSystem(scene);
  const drainageSystem = createDrainageSystem(scene);
  const weatherSystem = createWeatherSystem(scene);
  const markerSystem = createSensorMarkerSystem(scene, nodes);
  const labelSystem = createSensorLabelSystem(nodes);
  mount.appendChild(labelSystem.domElement);
  labelSystem.setSize(width, height);
  labelSystem.setVisible(useSimulationStore.getState().showSensorLabels);

  const simulationEffects = createSimulationEffects();
  const cameraPresets = createCameraPresetController(camera, controls);

  const clock = new THREE.Clock();
  let rafId = 0;
  let paused = document.hidden;
  let elapsed = 0;
  let stopSignal = useSimulationStore.getState().stopSignal;
  let lastMetricPush = 0;
  let cameraPresetNonce = useSimulationStore.getState().cameraPresetNonce;
  let showSensorLabels = useSimulationStore.getState().showSensorLabels;

  const t0 = performance.now();
  const animate = () => {
    rafId = requestAnimationFrame(animate);
    if (paused) return;

    const now = performance.now();
    const t = (now - t0) / 1000;
    const delta = Math.min(clock.getDelta(), 0.1);
    const sim = useSimulationStore.getState();

    if (sim.cameraPresetNonce !== cameraPresetNonce) {
      cameraPresetNonce = sim.cameraPresetNonce;
      if (sim.cameraPreset) {
        cameraPresets.focus(sim.cameraPreset);
      }
    }
    if (sim.showSensorLabels !== showSensorLabels) {
      showSensorLabels = sim.showSensorLabels;
      labelSystem.setVisible(showSensorLabels);
    }

    if (sim.stopSignal !== stopSignal) {
      stopSignal = sim.stopSignal;
      elapsed = 0;
      simulationEffects.reset();
    }
    if (sim.mode === "SIMULATION" && sim.running) {
      elapsed += delta * sim.playbackSpeed;
    }

    const visual = simulationEffects.update(
      {
        mode: sim.mode,
        simulationType: sim.simulationType,
        combinedMode: sim.combinedMode,
        combinedScenarios: sim.combinedScenarios,
        running: sim.running,
        params: sim.params,
        elapsed,
        playbackSpeed: sim.playbackSpeed,
      },
      delta
    );

    const activeIds = new Set([sim.simulationType, ...(sim.combinedMode ? sim.combinedScenarios : [])]);
    const affectedSensors = new Set<string>();
    for (const sc of TWIN_SIMULATIONS) {
      if (activeIds.has(sc.id)) {
        sc.affectedSensors.forEach((id) => affectedSensors.add(id));
      }
    }

    terrainSystem.update({ showIsolines: sim.showIsolines, rainIntensity: visual.rainIntensity });
    const waterMetrics = waterSystem.update(
      {
        relaveLevel: visual.relaveLevel,
        fillRate: visual.fillRate,
        rainIntensity: visual.rainIntensity,
        time: t,
      },
      delta
    );
    const surfaceY = waterSystem.getCurrentHeight();

    overflowSystem.update({
      freeboard: waterMetrics.freeboard,
      spillSeverity: waterMetrics.spillSeverity,
      surfaceY,
      time: t,
      delta,
    });

    damSystem.update({
      rainIntensity: visual.rainIntensity,
      saturation: visual.saturation,
      safetyFactor: visual.safetyFactor,
      seepageFlow: visual.seepageFlow,
      seepageLocation: visual.seepageLocation,
      freeboard: waterMetrics.freeboard,
      spillSeverity: waterMetrics.spillSeverity,
      surfaceY,
      piezometricPressure: visual.piezometricPressure,
      showSaturationMap: sim.showSaturationMap,
      showFlowVector: sim.showFlowVector,
      time: t,
      delta,
    });

    drainageSystem.update({
      rainIntensity: visual.rainIntensity,
      waterSurfaceY: surfaceY,
      time: t,
      spillSeverity: waterMetrics.spillSeverity,
    });

    weatherSystem.update(
      {
        rainIntensity: visual.rainIntensity,
        simulationType: sim.simulationType,
        running: sim.mode === "SIMULATION" && (sim.running || visual.isHeavyRain),
      },
      delta,
      sim.playbackSpeed
    );

    markerSystem.update({
      seepageLocation: visual.seepageLocation,
      seepageFlow: visual.seepageFlow,
      affectedSensors: [...affectedSensors],
      time: t,
    });
    labelSystem.update();

    if (onMetricsChange && now - lastMetricPush > 180) {
      onMetricsChange(simulationEffects.buildMetrics(waterMetrics));
      lastMetricPush = now;
    }

    controls.update();
    renderer.render(scene, camera);
    labelSystem.render(scene, camera);
  };
  animate();

  const onVisibility = () => {
    paused = document.hidden;
    if (!paused) {
      clock.getDelta();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  return {
    renderer,
    focusCamera: (preset) => cameraPresets.focus(preset),
    handleClick: (raycaster, mouse) => markerSystem.handleClick(raycaster, mouse, camera),
    resize: (w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelSystem.setSize(w, h);
    },
    dispose: () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("visibilitychange", onVisibility);
      cameraPresets.dispose();
      controls.dispose();
      markerSystem.dispose();
      labelSystem.dispose();
      weatherSystem.dispose();
      drainageSystem.dispose();
      overflowSystem.dispose();
      weirStructure.dispose();
      waterSystem.dispose();
      damSystem.dispose();
      terrainSystem.dispose();
      envMap.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
      if (labelSystem.domElement.parentElement === mount) {
        mount.removeChild(labelSystem.domElement);
      }
    },
  };
}

export { type CameraPresetId };
