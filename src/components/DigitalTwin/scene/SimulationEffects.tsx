import * as THREE from "three";
import { useSensorStore } from "@/stores/useSensorStore";
import { SimulationType, TwinMode } from "@/stores/useSimulationStore";
import {
  DESIGN_FILL_RATE_M3_DAY,
  OVERFLOW_SIM_MAX_M,
  RELAVE_MIN_M,
  SIM_DAY_DURATION_SEC,
  computeSafetyFactor,
  saturationFromLevel,
} from "@/components/DigitalTwin/constants";
import {
  createTwinPhysics,
  spillSeverityFromDischarge,
  weirDischargeM3s,
  type PhysicsState,
} from "@/components/DigitalTwin/physics/simulationPhysics";
import {
  createSensorSimulator,
  type SyntheticReading,
} from "@/components/DigitalTwin/physics/sensorSimulation";
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
  /** Severidad física del rebose [0..1] = Q_vertedero / capacidad de diseño. */
  spillSeverity: number;
  /** Caudal físico por el vertedero (m³/s). */
  spillFlowM3s: number;
  /** Caudal entrante total (m³/s). */
  inflowM3s: number;
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
  spillFlowM3s: number;
  inflowM3s: number;
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
  spillSeverity: 0,
  spillFlowM3s: 0,
  inflowM3s: 0,
};

function numberParam(params: Record<string, number | string>, key: string, fallback: number): number {
  const value = params[key];
  return typeof value === "number" ? value : fallback;
}

function stringParam(params: Record<string, number | string>, key: string, fallback: string): string {
  const value = params[key];
  return typeof value === "string" ? value : fallback;
}

function safeLerp(current: number, target: number, alpha: number): number {
  if (!Number.isFinite(target)) return current;
  return THREE.MathUtils.lerp(current, target, alpha);
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
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
      ? THREE.MathUtils.clamp(avgPressure / 130, 0, 1)
      : saturationFromLevel(level, rain, 0);

  return { level, rain, saturation };
}

/** Segundos simulados por segundo real a velocidad x1 (8 s reales ≈ 1 día). */
const SIM_SECONDS_PER_REAL_SECOND = 86_400 / SIM_DAY_DURATION_SEC;

/** Estado físico de preview: la cota viene del reset, el resto refleja los sliders. */
function buildPreviewState(
  base: PhysicsState,
  inputs: { fillRateM3Day: number; seismic: number; seepageFlowLMin: number },
  rainMmH: number
): PhysicsState {
  const levelM = base.levelM;
  const saturation = saturationFromLevel(levelM, rainMmH, inputs.seepageFlowLMin);
  const spill = weirDischargeM3s(levelM);
  return {
    ...base,
    rainMmH,
    saturation,
    safetyFactor: computeSafetyFactor(levelM, saturation, inputs.seismic, inputs.seepageFlowLMin),
    seepageFlowLMin: inputs.seepageFlowLMin,
    piezometricPressure: THREE.MathUtils.clamp(saturation * 0.92 + inputs.seepageFlowLMin / 80, 0, 1),
    spillM3s: spill,
    spillSeverity: spillSeverityFromDischarge(spill),
    inflowM3s: inputs.fillRateM3Day / 86_400,
  };
}

export function createSimulationEffects() {
  let visualState: SimulationVisualState = { ...DEFAULT_STATE };
  const physics = createTwinPhysics();
  const sensors = createSensorSimulator();
  let lastReadings: SyntheticReading[] = [];
  let lastResetLevel: number | null = null;
  let wasRunning = false;

  const resetPhysicsTo = (levelM: number, seepageLocation: string) => {
    physics.reset(levelM);
    sensors.reset(physics.getState(), seepageLocation);
    lastResetLevel = levelM;
  };

  return {
    update(input: SimulationInput, delta: number): SimulationVisualState {
      const activeScenarios = new Set<SimulationType>([input.simulationType]);
      if (input.combinedMode) {
        input.combinedScenarios.forEach((scenario) => activeScenarios.add(scenario));
      }

      const fillRateParam = numberParam(input.params, "fillRate", DESIGN_FILL_RATE_M3_DAY);
      const relaveLevelParam = numberParam(input.params, "relaveLevel", 780);
      const rainIntensityParam = numberParam(input.params, "rainIntensity", 20);
      const seismic = numberParam(input.params, "seismic", 0);
      const seepageFlowParam = numberParam(input.params, "seepageFlow", 0);
      const seepageLocation = stringParam(input.params, "seepageLocation", "Base Central (PI-03)");

      const rainScenario = activeScenarios.has("HEAVY_RAIN") || activeScenarios.has("OVERFLOW_DEMO");
      const fillScenario =
        activeScenarios.has("WATER_LEVEL_RISE") || activeScenarios.has("OVERFLOW_DEMO");
      const seepageScenario = activeScenarios.has("SEEPAGE_DETECTION");

      let targetRelaveLevel: number;
      let targetRainIntensity: number;
      let targetSeepageFlow: number;
      let targetSaturation: number;
      let targetSafetyFactor: number;
      let targetPiezometric: number;
      let targetSpillSeverity = 0;
      let targetSpillFlow = 0;
      let targetInflow = 0;

      if (input.mode === "REAL") {
        const real = estimateRealSensors();
        targetRelaveLevel = real.level;
        targetRainIntensity = real.rain;
        targetSeepageFlow = 0;
        targetSaturation = real.saturation;
        targetSafetyFactor = computeSafetyFactor(real.level, real.saturation, 0, 0);
        targetPiezometric = THREE.MathUtils.clamp(real.saturation * 0.92, 0, 1);
        targetSpillFlow = weirDischargeM3s(real.level);
        targetSpillSeverity = spillSeverityFromDischarge(targetSpillFlow);
        lastReadings = [];
        wasRunning = false;
      } else {
        const seismicInput = activeScenarios.has("SAFETY_FACTOR") ? seismic : seismic * 0.4;
        const physicsInputs = {
          fillRateM3Day: fillScenario ? fillRateParam : 0,
          rainPeakMmH: rainScenario ? rainIntensityParam : 0,
          stormActive: input.running && rainScenario,
          seismic: seismicInput,
          seepageFlowLMin: seepageScenario ? seepageFlowParam : 0,
        };

        const startedNow = input.running && !wasRunning;
        const levelChanged = lastResetLevel === null || Math.abs(relaveLevelParam - lastResetLevel) > 1e-6;
        if (!input.running && levelChanged) {
          resetPhysicsTo(relaveLevelParam, seepageLocation);
        } else if (startedNow && levelChanged) {
          resetPhysicsTo(relaveLevelParam, seepageLocation);
        }
        wasRunning = input.running;

        let phys: PhysicsState;
        if (input.running) {
          const dtSim = delta * input.playbackSpeed * SIM_SECONDS_PER_REAL_SECOND;
          phys = physics.step(physicsInputs, dtSim);
          lastReadings = sensors.update(phys, seepageLocation, dtSim);
        } else {
          // Preview estático: refleja los sliders sin integrar volumen.
          phys = buildPreviewState(physics.getState(), physicsInputs, rainScenario ? rainIntensityParam : 0);
          lastReadings = sensors.update(phys, seepageLocation, 0);
        }

        targetRelaveLevel = finiteOr(phys.levelM, visualState.relaveLevel);
        targetRainIntensity = finiteOr(phys.rainMmH, 0);
        targetSeepageFlow = finiteOr(phys.seepageFlowLMin, 0);
        targetSaturation = activeScenarios.has("DIKE_SATURATION")
          ? THREE.MathUtils.clamp(finiteOr(phys.saturation, 0) * 1.08, 0, 1)
          : finiteOr(phys.saturation, 0);
        targetSafetyFactor = finiteOr(phys.safetyFactor, 1.5);
        targetPiezometric = finiteOr(phys.piezometricPressure, 0.35);
        targetSpillSeverity = finiteOr(phys.spillSeverity, 0);
        targetSpillFlow = finiteOr(phys.spillM3s, 0);
        targetInflow = finiteOr(phys.inflowM3s, 0);
      }

      const alpha = THREE.MathUtils.clamp(delta * (input.playbackSpeed === 1 ? 1.6 : 2.4), 0.04, 0.32);

      visualState = {
        relaveLevel: safeLerp(visualState.relaveLevel, targetRelaveLevel, alpha),
        fillRate: safeLerp(visualState.fillRate, fillRateParam, alpha),
        rainIntensity: safeLerp(visualState.rainIntensity, targetRainIntensity, alpha),
        saturation: safeLerp(visualState.saturation, targetSaturation, alpha),
        safetyFactor: safeLerp(visualState.safetyFactor, targetSafetyFactor, alpha),
        seepageFlow: safeLerp(visualState.seepageFlow, targetSeepageFlow, alpha),
        seepageLocation,
        isHeavyRain:
          rainScenario &&
          input.mode === "SIMULATION" &&
          (input.running || rainIntensityParam > 0),
        piezometricPressure: safeLerp(visualState.piezometricPressure, targetPiezometric, alpha),
        spillSeverity: safeLerp(visualState.spillSeverity, targetSpillSeverity, alpha),
        spillFlowM3s: safeLerp(visualState.spillFlowM3s, targetSpillFlow, alpha),
        inflowM3s: safeLerp(visualState.inflowM3s, targetInflow, alpha),
      };

      return visualState;
    },
    /** Lecturas sintéticas del último paso (vacío en modo REAL). */
    getSyntheticReadings(): SyntheticReading[] {
      return lastReadings;
    },
    reset() {
      visualState = { ...DEFAULT_STATE };
      lastReadings = [];
      lastResetLevel = null;
      wasRunning = false;
      physics.reset(780);
      sensors.reset(physics.getState(), DEFAULT_STATE.seepageLocation);
    },
    buildMetrics(water: { freeboard: number; spillSeverity: number; spillM: number }): TwinMetrics {
      return {
        relaveLevel: visualState.relaveLevel,
        freeboard: water.freeboard,
        rainIntensity: visualState.rainIntensity,
        safetyFactor: visualState.safetyFactor,
        seepageFlow: visualState.seepageFlow,
        piezometricPressure: visualState.piezometricPressure,
        spillSeverity: Math.max(water.spillSeverity, visualState.spillSeverity),
        spillM: water.spillM,
        spillFlowM3s: visualState.spillFlowM3s,
        inflowM3s: visualState.inflowM3s,
      };
    },
  };
}
