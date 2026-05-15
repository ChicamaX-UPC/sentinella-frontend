"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { createTerrainSystem } from "@/components/DigitalTwin/scene/Terrain";
import { createTailingDamSystem } from "@/components/DigitalTwin/scene/TailingDam";
import { createWaterPlaneSystem } from "@/components/DigitalTwin/scene/WaterPlane";
import { createWeatherSystem } from "@/components/DigitalTwin/scene/WeatherSystem";
import { createSensorMarkerSystem } from "@/components/DigitalTwin/scene/SensorMarkers";
import { createSimulationEffects, TwinMetrics } from "@/components/DigitalTwin/scene/SimulationEffects";

type TwinNode = {
  id: string;
  externalId?: string;
  name: string;
  sensorType?: string;
  status?: string;
};

type Props = {
  nodes: TwinNode[];
  onSelectSensor?: (sensor: { nodeId: string; name: string; status: string; value?: number; unit?: string }) => void;
  onMetricsChange?: (metrics: TwinMetrics) => void;
};

export default function TwinCanvas({ nodes, onSelectSensor, onMetricsChange }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 520;

    const scene = new THREE.Scene();
    // Fondo tipo cielo diurno árido (referencia fotos).
    scene.background = new THREE.Color(0xbdd6e8);
    // Niebla suave: far mayor que near para no velar el fondo.
    scene.fog = new THREE.Fog(0xcce0ef, 720, 2800);
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1400);
    camera.position.set(170, 88, 178);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 8, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 520;
    controls.minDistance = 55;

    scene.add(new THREE.AmbientLight(0xfff0dc, 0.72));
    const hemi = new THREE.HemisphereLight(0xcfe0ef, 0xb89163, 0.55);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff2d6, 1.35);
    dir.position.set(85, 160, 70);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
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
    const weatherSystem = createWeatherSystem(scene);
    const markerSystem = createSensorMarkerSystem(scene, nodes);
    const simulationEffects = createSimulationEffects();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const clock = new THREE.Clock();
    let frame = 0;
    let elapsed = 0;
    let stopSignal = useSimulationStore.getState().stopSignal;
    let lastMetricPush = 0;

    const t0 = performance.now();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      const t = (now - t0) / 1000;
      const delta = Math.min(clock.getDelta(), 0.1);
      const sim = useSimulationStore.getState();

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
      damSystem.update({
        rainIntensity: visual.rainIntensity,
        saturation: visual.saturation,
        safetyFactor: visual.safetyFactor,
        seepageFlow: visual.seepageFlow,
        seepageLocation: visual.seepageLocation,
        freeboard: waterMetrics.freeboard,
        showSaturationMap: sim.showSaturationMap,
        showFlowVector: sim.showFlowVector,
        time: t,
        delta,
      });
      weatherSystem.update(
        {
          rainIntensity: visual.rainIntensity,
          simulationType: sim.simulationType,
          running: sim.mode === "SIMULATION" && sim.running,
        },
        delta,
        sim.playbackSpeed
      );
      markerSystem.update(t);

      if (onMetricsChange && now - lastMetricPush > 180) {
        onMetricsChange(simulationEffects.buildMetrics(waterMetrics.freeboard));
        lastMetricPush = now;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onClick = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      const selected = markerSystem.handleClick(raycaster, mouse, camera);
      if (!selected) {
        return;
      }
      onSelectSensor?.(selected);
    };
    renderer.domElement.addEventListener("click", onClick);

    const onResize = () => {
      const w = mount.clientWidth || 800;
      const h = mount.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      markerSystem.dispose();
      weatherSystem.dispose();
      waterSystem.dispose();
      damSystem.dispose();
      terrainSystem.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [nodes, onSelectSensor, onMetricsChange]);

  return <div ref={mountRef} className="h-[min(70vh,560px)] w-full min-h-[400px] rounded-lg border border-accent/30" />;
}
