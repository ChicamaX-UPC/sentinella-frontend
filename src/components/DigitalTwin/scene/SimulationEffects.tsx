import * as THREE from "three";
import { useSensorStore } from "@/stores/useSensorStore";
import { SimulationType, TwinMode } from "@/stores/useSimulationStore";

export type SimulationInput = {
  mode: TwinMode;
  simulationType: SimulationType;
  combinedMode: boolean;
  combinedScenarios: SimulationType[];
  running: boolean;
  params: Record<string, number | string>;
  elapsed: number;
  playbackSpeed: 1 | 10 | 30;
};

export type SimulationVisualState = {
  relaveLevel: number;
  fillRate: number;
  rainIntensity: number;
  saturation: number;
  safetyFactor: number;
  seepageFlow: number;
  seepageLocation: string;
  isHeavyRain: boolean;
};

export type TwinMetrics = {
  relaveLevel: number;
  freeboard: number;
  rainIntensity: number;
  safetyFactor: number;
  seepageFlow: number;
};

const DEFAULT_STATE: SimulationVisualState = {
  relaveLevel: 780,
  fillRate: 60,
  rainIntensity: 0,
  saturation: 0.3,
  safetyFactor: 1.6,
  seepageFlow: 0,
  seepageLocation: "Base Central (PI-03)",
  isHeavyRain: false,
};

const RELAVE_MIN = 774;
const RELAVE_SIM_MAX = 787.5;

function numberParam(params: Record<string, number | string>, key: string, fallback: number): number {
  const value = params[key];
  return typeof value === "number" ? value : fallback;
}

function stringParam(params: Record<string, number | string>, key: string, fallback: string): string {
  const value = params[key];
  return typeof value === "string" ? value : fallback;
}

function estimateRealLevel(): number {
  const lastByNode = useSensorStore.getState().lastByNode;
  const key = Object.keys(lastByNode).find((nodeId) => {
    const reading = lastByNode[nodeId];
    return String(reading?.type ?? "").toLowerCase().includes("water");
  });
  const value = key ? lastByNode[key]?.value : undefined;
  if (typeof value === "number") {
    return THREE.MathUtils.clamp(value, RELAVE_MIN, RELAVE_SIM_MAX);
  }
  return 780;
}

function computeSafetyFactor(relaveLevel: number, saturation: number, seismic: number, seepageFlow: number): number {
  const fsRaw = 1.85 - saturation * 0.52 - seismic * 1.9 - (relaveLevel - 780) * 0.03 - seepageFlow * 0.008;
  return THREE.MathUtils.clamp(fsRaw, 0.8, 2.1);
}

export function createSimulationEffects() {
  let visualState: SimulationVisualState = { ...DEFAULT_STATE };

  return {
    update(input: SimulationInput, delta: number): SimulationVisualState {
      const activeScenarios = new Set<SimulationType>([input.simulationType]);
      if (input.combinedMode) {
        input.combinedScenarios.forEach((scenario) => activeScenarios.add(scenario));
      }

      const fillRate = numberParam(input.params, "fillRate", 60);
      const relaveLevelParam = numberParam(input.params, "relaveLevel", 780);
      const rainIntensityParam = numberParam(input.params, "rainIntensity", 20);
      const seismic = numberParam(input.params, "seismic", 0);
      const seepageFlowParam = numberParam(input.params, "seepageFlow", 0);
      const seepageLocation = stringParam(input.params, "seepageLocation", "Base Central (PI-03)");

      const baseRealLevel = estimateRealLevel();
      let targetRelaveLevel = input.mode === "REAL" ? baseRealLevel : relaveLevelParam;
      let targetRainIntensity = 0;
      let targetSeepageFlow = input.mode === "SIMULATION" ? seepageFlowParam : 0;

      if (input.mode === "SIMULATION" && input.running) {
        if (activeScenarios.has("WATER_LEVEL_RISE")) {
          targetRelaveLevel = THREE.MathUtils.clamp(
            relaveLevelParam + (fillRate / 220) * 5.8 + Math.min(4.2, input.elapsed * 0.017 * (fillRate / 55)),
            RELAVE_MIN,
            RELAVE_SIM_MAX
          );
        }
        if (activeScenarios.has("HEAVY_RAIN")) {
          targetRainIntensity = Math.max(targetRainIntensity, rainIntensityParam);
          targetRelaveLevel = THREE.MathUtils.clamp(
            targetRelaveLevel + (rainIntensityParam / 90) * 2.2 + Math.sin(input.elapsed * 0.055) * 0.18,
            RELAVE_MIN,
            RELAVE_SIM_MAX
          );
        }
        if (activeScenarios.has("SEEPAGE_DETECTION")) {
          targetSeepageFlow = Math.max(targetSeepageFlow, seepageFlowParam);
        }
        if (activeScenarios.has("DIKE_SATURATION")) {
          targetRelaveLevel = THREE.MathUtils.clamp(targetRelaveLevel + 0.4, RELAVE_MIN, RELAVE_SIM_MAX);
        }
        if (activeScenarios.has("SAFETY_FACTOR")) {
          targetRelaveLevel = THREE.MathUtils.clamp(targetRelaveLevel + seismic * 2.4, RELAVE_MIN, RELAVE_SIM_MAX);
        }
      }

      const targetSaturation = THREE.MathUtils.clamp(
        (targetRelaveLevel - RELAVE_MIN) / (RELAVE_SIM_MAX - RELAVE_MIN) * 0.74 + targetRainIntensity / 90 * 0.35 + targetSeepageFlow / 50 * 0.22,
        0,
        1
      );
      const seismicBoost = activeScenarios.has("SAFETY_FACTOR") ? seismic : seismic * 0.4;
      const targetSafetyFactor = computeSafetyFactor(targetRelaveLevel, targetSaturation, seismicBoost, targetSeepageFlow);

      const alpha = THREE.MathUtils.clamp(delta * (input.playbackSpeed === 1 ? 1.4 : 2.2), 0.03, 0.28);

      visualState = {
        relaveLevel: THREE.MathUtils.lerp(visualState.relaveLevel, targetRelaveLevel, alpha),
        fillRate: THREE.MathUtils.lerp(visualState.fillRate, fillRate, alpha),
        rainIntensity: THREE.MathUtils.lerp(visualState.rainIntensity, targetRainIntensity, alpha),
        saturation: THREE.MathUtils.lerp(visualState.saturation, targetSaturation, alpha),
        safetyFactor: THREE.MathUtils.lerp(visualState.safetyFactor, targetSafetyFactor, alpha),
        seepageFlow: THREE.MathUtils.lerp(visualState.seepageFlow, targetSeepageFlow, alpha),
        seepageLocation,
        isHeavyRain: activeScenarios.has("HEAVY_RAIN") && input.mode === "SIMULATION" && input.running,
      };

      return visualState;
    },
    reset() {
      visualState = { ...DEFAULT_STATE };
    },
    buildMetrics(freeboard: number): TwinMetrics {
      return {
        relaveLevel: visualState.relaveLevel,
        freeboard,
        rainIntensity: visualState.rainIntensity,
        safetyFactor: visualState.safetyFactor,
        seepageFlow: visualState.seepageFlow,
      };
    },
  };
}
