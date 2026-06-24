import * as THREE from "three";
import { useSensorStore } from "@/stores/useSensorStore";
import { SimulationType, TwinMode } from "@/stores/useSimulationStore";
import {
  DESIGN_FILL_RATE_M3_DAY,
  DESIGN_RAIN_MM_H,
  OVERFLOW_SIM_MAX_M,
  RELAVE_MAX_OPERATING_M,
  RELAVE_MIN_M,
  computeSafetyFactor,
  levelRiseFromFillRate,
  levelRiseFromRain,
  saturationFromLevel,
} from "@/components/DigitalTwin/constants";
import { SENSOR_POSITIONS } from "@/components/DigitalTwin/sensorPositions";

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
  piezometricPressure: number;
};

export type TwinMetrics = {
  relaveLevel: number;
  freeboard: number;
  rainIntensity: number;
  safetyFactor: number;
  seepageFlow: number;
  piezometricPressure: number;
  spillSeverity: number;
  spillM: number;
};

const DEFAULT_STATE: SimulationVisualState = {
  relaveLevel: 780,
  fillRate: DESIGN_FILL_RATE_M3_DAY,
  rainIntensity: 0,
  saturation: 0.3,
  safetyFactor: 1.6,
  seepageFlow: 0,
  seepageLocation: "Base Central (PI-03)",
  isHeavyRain: false,
  piezometricPressure: 0.35,
};

function numberParam(params: Record<string, number | string>, key: string, fallback: number): number {
  const value = params[key];
  return typeof value === "number" ? value : fallback;
}

function stringParam(params: Record<string, number | string>, key: string, fallback: string): string {
  const value = params[key];
  return typeof value === "string" ? value : fallback;
}

function readingByExternalId(externalId: string): number | undefined {
  const lastByNode = useSensorStore.getState().lastByNode;
  const direct = lastByNode[externalId]?.value;
  if (typeof direct === "number") {
    return direct;
  }
  const match = Object.values(lastByNode).find((r) => r.nodeId === externalId);
  return typeof match?.value === "number" ? match.value : undefined;
}

function estimateRealSensors(): { level: number; rain: number; saturation: number } {
  const nw = readingByExternalId("NW-01");
  const pv = readingByExternalId("PV-01");
  const piReadings = SENSOR_POSITIONS.filter((p) => p.type === "pressure")
    .map((p) => readingByExternalId(p.nodeId))
    .filter((v): v is number => typeof v === "number");
  const avgPressure = piReadings.length
    ? piReadings.reduce((a, b) => a + b, 0) / piReadings.length
    : undefined;

  const level = typeof nw === "number" ? THREE.MathUtils.clamp(nw, RELAVE_MIN_M, OVERFLOW_SIM_MAX_M) : 780;
  const rain = typeof pv === "number" ? THREE.MathUtils.clamp(pv, 0, 90) : 0;
  const saturation =
    typeof avgPressure === "number"
      ? THREE.MathUtils.clamp(avgPressure / 100, 0, 1)
      : saturationFromLevel(level, rain, 0);

  return { level, rain, saturation };
}

export function createSimulationEffects() {
  let visualState: SimulationVisualState = { ...DEFAULT_STATE };
  let simLevel = 780;

  return {
    update(input: SimulationInput, delta: number): SimulationVisualState {
      const activeScenarios = new Set<SimulationType>([input.simulationType]);
      if (input.combinedMode) {
        input.combinedScenarios.forEach((scenario) => activeScenarios.add(scenario));
      }

      const fillRate = numberParam(input.params, "fillRate", DESIGN_FILL_RATE_M3_DAY);
      const relaveLevelParam = numberParam(input.params, "relaveLevel", 780);
      const rainIntensityParam = numberParam(input.params, "rainIntensity", 20);
      const seismic = numberParam(input.params, "seismic", 0);
      const seepageFlowParam = numberParam(input.params, "seepageFlow", 0);
      const seepageLocation = stringParam(input.params, "seepageLocation", "Base Central (PI-03)");

      const real = estimateRealSensors();
      let targetRelaveLevel = input.mode === "REAL" ? real.level : relaveLevelParam;
      let targetRainIntensity = input.mode === "REAL" ? real.rain : 0;
      let targetSeepageFlow = input.mode === "SIMULATION" ? seepageFlowParam : 0;

      const previewStatic = input.mode === "SIMULATION" && !input.running;
      if (previewStatic) {
        targetRelaveLevel = relaveLevelParam;
        if (activeScenarios.has("HEAVY_RAIN")) {
          targetRainIntensity = rainIntensityParam;
        }
        if (activeScenarios.has("SEEPAGE_DETECTION")) {
          targetSeepageFlow = seepageFlowParam;
        }
      }

      if (input.mode === "SIMULATION" && input.running) {
        simLevel = relaveLevelParam;
        if (activeScenarios.has("OVERFLOW_DEMO") || input.simulationType === "OVERFLOW_DEMO") {
          simLevel = Math.max(simLevel, relaveLevelParam);
          simLevel += levelRiseFromFillRate(fillRate, delta, input.playbackSpeed) * 1.2;
        }
        if (activeScenarios.has("WATER_LEVEL_RISE")) {
          simLevel += levelRiseFromFillRate(fillRate, delta, input.playbackSpeed);
        }
        if (activeScenarios.has("HEAVY_RAIN")) {
          targetRainIntensity = Math.max(targetRainIntensity, rainIntensityParam);
          simLevel += levelRiseFromRain(rainIntensityParam, delta, input.playbackSpeed);
          simLevel += Math.sin(input.elapsed * 0.055) * 0.002;
        }
        if (activeScenarios.has("DIKE_SATURATION")) {
          simLevel = Math.max(simLevel, relaveLevelParam);
        }
        if (activeScenarios.has("SAFETY_FACTOR")) {
          simLevel += seismic * 0.004 * delta * input.playbackSpeed;
        }
        if (activeScenarios.has("SEEPAGE_DETECTION")) {
          targetSeepageFlow = Math.max(targetSeepageFlow, seepageFlowParam);
        }
        targetRelaveLevel = THREE.MathUtils.clamp(simLevel, RELAVE_MIN_M, OVERFLOW_SIM_MAX_M);
      }

      const targetSaturation =
        input.mode === "REAL"
          ? real.saturation
          : activeScenarios.has("DIKE_SATURATION")
            ? saturationFromLevel(targetRelaveLevel, targetRainIntensity, targetSeepageFlow) * 1.08
            : saturationFromLevel(targetRelaveLevel, targetRainIntensity, targetSeepageFlow);

      const seismicBoost = activeScenarios.has("SAFETY_FACTOR") ? seismic : seismic * 0.4;
      const targetSafetyFactor = computeSafetyFactor(
        targetRelaveLevel,
        targetSaturation,
        seismicBoost,
        targetSeepageFlow
      );
      const targetPiezometric = THREE.MathUtils.clamp(targetSaturation * 0.92 + targetSeepageFlow / 80, 0, 1);

      const alpha = THREE.MathUtils.clamp(delta * (input.playbackSpeed === 1 ? 1.6 : 2.4), 0.04, 0.32);

      visualState = {
        relaveLevel: THREE.MathUtils.lerp(visualState.relaveLevel, targetRelaveLevel, alpha),
        fillRate: THREE.MathUtils.lerp(visualState.fillRate, fillRate, alpha),
        rainIntensity: THREE.MathUtils.lerp(visualState.rainIntensity, targetRainIntensity, alpha),
        saturation: THREE.MathUtils.lerp(visualState.saturation, targetSaturation, alpha),
        safetyFactor: THREE.MathUtils.lerp(visualState.safetyFactor, targetSafetyFactor, alpha),
        seepageFlow: THREE.MathUtils.lerp(visualState.seepageFlow, targetSeepageFlow, alpha),
        seepageLocation,
        isHeavyRain:
          activeScenarios.has("HEAVY_RAIN") &&
          input.mode === "SIMULATION" &&
          (input.running || rainIntensityParam > 0),
        piezometricPressure: THREE.MathUtils.lerp(visualState.piezometricPressure, targetPiezometric, alpha),
      };

      return visualState;
    },
    reset() {
      visualState = { ...DEFAULT_STATE };
      simLevel = 780;
    },
    buildMetrics(water: { freeboard: number; spillSeverity: number; spillM: number }): TwinMetrics {
      return {
        relaveLevel: visualState.relaveLevel,
        freeboard: water.freeboard,
        rainIntensity: visualState.rainIntensity,
        safetyFactor: visualState.safetyFactor,
        seepageFlow: visualState.seepageFlow,
        piezometricPressure: visualState.piezometricPressure,
        spillSeverity: water.spillSeverity,
        spillM: water.spillM,
      };
    },
  };
}
