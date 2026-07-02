/**
 * Motor físico del gemelo digital — balance hídrico por volumen.
 *
 * A diferencia del motor heurístico anterior (que sumaba cota directamente), aquí el
 * estado primario es el VOLUMEN almacenado en el vaso y la cota emerge de la curva
 * cota–volumen. El desborde no es un modo especial: aparece cuando el caudal entrante
 * supera la capacidad de descarga del vertedero (ecuación de vertedero Q = C·L·H^1.5).
 *
 *   dV/dt = Q_relaves + Q_lluvia − Q_vertedero − Q_evaporación − Q_filtración
 */
import {
  BASIN_AREA_M2,
  BASIN_VOLUME_M3,
  CATCHMENT_RATIO,
  CROWN_ELEVATION_M,
  OVERFLOW_SIM_MAX_M,
  RELAVE_MAX_OPERATING_M,
  RELAVE_MIN_M,
  computeSafetyFactor,
  saturationFromLevel,
} from "@/components/DigitalTwin/constants";

// ---------------------------------------------------------------------------
// Parámetros hidráulicos (expediente técnico + diseño del aliviadero)
// ---------------------------------------------------------------------------

/** Cota de cresta del vertedero (aliviadero recortado en la corona). */
export const SPILLWAY_CREST_M = CROWN_ELEVATION_M;
/** Longitud efectiva del vertedero (m). */
export const WEIR_LENGTH_M = 2.5;
/** Coeficiente de descarga (vertedero de cresta ancha, unidades SI). */
export const WEIR_CD = 1.6;
/** Lámina de diseño sobre la cresta (m) — severidad 1 cuando Q alcanza esta capacidad. */
export const DESIGN_SPILL_HEAD_M = 0.35;
/** Coeficiente de escorrentía de la cuenca de aporte. */
export const RUNOFF_COEFFICIENT = 0.85;
/** Evaporación media sobre el espejo de agua (mm/día). */
export const EVAPORATION_MM_DAY = 5.5;
/** Infiltración de fondo proporcional a la carga hidráulica (m³/día por metro de carga). */
export const BASE_INFILTRATION_M3_DAY_PER_M = 6;

const DEPTH_M = CROWN_ELEVATION_M - RELAVE_MIN_M;

/**
 * Exponente hipsométrico k de la curva área–profundidad A(L) = A_max · x^k,
 * con x = (L − L_min)/D. Se resuelve para que V(RELAVE_MAX_OPERATING) = BASIN_VOLUME_M3
 * con A(CROWN) = BASIN_AREA_M2, de modo que la curva honra los datos del expediente.
 */
function solveHypsometricExponent(): number {
  const xOp = (RELAVE_MAX_OPERATING_M - RELAVE_MIN_M) / DEPTH_M;
  const target = BASIN_VOLUME_M3;
  const volumeAt = (n: number) => ((BASIN_AREA_M2 * DEPTH_M) / n) * Math.pow(xOp, n);
  let lo = 1.05;
  let hi = 8;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (volumeAt(mid) > target) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2 - 1;
}

export const HYPSOMETRIC_K = solveHypsometricExponent();

/** Volumen almacenado (m³) para una cota dada (msnm). */
export function volumeFromLevel(levelM: number): number {
  const clamped = Math.min(Math.max(levelM, RELAVE_MIN_M), OVERFLOW_SIM_MAX_M);
  const x = (clamped - RELAVE_MIN_M) / DEPTH_M;
  const n = HYPSOMETRIC_K + 1;
  return ((BASIN_AREA_M2 * DEPTH_M) / n) * Math.pow(x, n);
}

/** Cota (msnm) para un volumen almacenado (m³) — inversa analítica de la curva potencial. */
export function levelFromVolume(volumeM3: number): number {
  if (volumeM3 <= 0) {
    return RELAVE_MIN_M;
  }
  const n = HYPSOMETRIC_K + 1;
  const x = Math.pow((volumeM3 * n) / (BASIN_AREA_M2 * DEPTH_M), 1 / n);
  return Math.min(RELAVE_MIN_M + x * DEPTH_M, OVERFLOW_SIM_MAX_M);
}

/** Área del espejo de agua (m²) a una cota dada. */
export function surfaceAreaAtLevel(levelM: number): number {
  const clamped = Math.min(Math.max(levelM, RELAVE_MIN_M), OVERFLOW_SIM_MAX_M);
  const x = (clamped - RELAVE_MIN_M) / DEPTH_M;
  return BASIN_AREA_M2 * Math.pow(Math.max(x, 0.02), HYPSOMETRIC_K);
}

/** Caudal por el vertedero (m³/s) según la lámina H sobre la cresta. */
export function weirDischargeM3s(levelM: number): number {
  const head = levelM - SPILLWAY_CREST_M;
  if (head <= 0) {
    return 0;
  }
  return WEIR_CD * WEIR_LENGTH_M * Math.pow(head, 1.5);
}

/** Capacidad de diseño del vertedero (m³/s) — referencia para la severidad. */
export const DESIGN_SPILL_CAPACITY_M3S = WEIR_CD * WEIR_LENGTH_M * Math.pow(DESIGN_SPILL_HEAD_M, 1.5);

/** Severidad de rebose [0..1] como fracción de la capacidad de diseño del vertedero. */
export function spillSeverityFromDischarge(dischargeM3s: number): number {
  if (dischargeM3s <= 0) {
    return 0;
  }
  return Math.min(1, dischargeM3s / DESIGN_SPILL_CAPACITY_M3S);
}

// ---------------------------------------------------------------------------
// Ruido estocástico — proceso de Ornstein-Uhlenbeck
// ---------------------------------------------------------------------------

export type OuProcess = {
  step: (dtSeconds: number) => number;
  value: () => number;
  reset: () => void;
};

/** Gaussiana estándar vía Box-Muller. */
export function gaussian(rng: () => number = Math.random): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Proceso OU: dx = θ(μ − x)dt + σ√dt·N(0,1). θ en 1/h, dt en segundos.
 * Reversión a la media: modela ruido de instrumento con memoria corta.
 */
export function createOuProcess(
  thetaPerHour: number,
  sigma: number,
  mu = 0,
  rng: () => number = Math.random
): OuProcess {
  let x = mu;
  return {
    step: (dtSeconds: number) => {
      const dtH = Math.max(0, dtSeconds / 3600);
      if (dtH <= 0) return x;
      const theta = Math.max(thetaPerHour, 1e-6);
      const decay = Math.exp(-theta * dtH);
      const noiseVar = (sigma * sigma * (1 - Math.exp(-2 * theta * dtH))) / (2 * theta);
      x = mu + (x - mu) * decay + Math.sqrt(Math.max(noiseVar, 0)) * gaussian(rng);
      if (!Number.isFinite(x)) x = mu;
      return x;
    },
    value: () => x,
    reset: () => {
      x = mu;
    },
  };
}

// ---------------------------------------------------------------------------
// Hietograma de tormenta (rampa – pico – recesión) con ruido multiplicativo
// ---------------------------------------------------------------------------

/** Duración de una celda de tormenta (h simuladas). */
export const STORM_CELL_DURATION_H = 8;

/**
 * Envolvente [0..1] de la celda de tormenta en función de la fase (h dentro de la celda):
 * rampa suave hasta el pico (2 h), meseta (3 h), recesión (3 h) hasta el 20 %.
 */
export function stormEnvelope(phaseHours: number): number {
  const t = ((phaseHours % STORM_CELL_DURATION_H) + STORM_CELL_DURATION_H) % STORM_CELL_DURATION_H;
  if (t < 2) {
    const s = t / 2;
    return s * s * (3 - 2 * s);
  }
  if (t < 5) {
    return 1;
  }
  const s = (t - 5) / 3;
  return 1 - s * s * (3 - 2 * s) * 0.8;
}

// ---------------------------------------------------------------------------
// Motor de física
// ---------------------------------------------------------------------------

export type PhysicsInputs = {
  /** Aporte de relaves (m³/día). 0 si el escenario no lo incluye. */
  fillRateM3Day: number;
  /** Pico de lluvia del hietograma (mm/h). 0 = sin lluvia. */
  rainPeakMmH: number;
  /** true → hietograma estocástico; false → intensidad constante (preview). */
  stormActive: boolean;
  /** Aceleración sísmica (g). */
  seismic: number;
  /** Filtración puntual impuesta por escenario (L/min). */
  seepageFlowLMin: number;
};

export type PhysicsState = {
  levelM: number;
  volumeM3: number;
  rainMmH: number;
  inflowM3s: number;
  spillM3s: number;
  spillHeadM: number;
  spillSeverity: number;
  saturation: number;
  safetyFactor: number;
  seepageFlowLMin: number;
  piezometricPressure: number;
  simTimeHours: number;
};

export type TwinPhysics = {
  reset: (levelM: number) => void;
  /** Avanza la física dtSimSeconds segundos simulados. */
  step: (inputs: PhysicsInputs, dtSimSeconds: number) => PhysicsState;
  getState: () => PhysicsState;
};

/** Paso máximo de integración (s simulados) — mantiene estable la descarga del vertedero. */
const MAX_SUBSTEP_S = 900;
/** Constante de tiempo de la saturación del dique (h). */
const SATURATION_TAU_H = 4;

export function createTwinPhysics(rng: () => number = Math.random): TwinPhysics {
  let volume = volumeFromLevel(780);
  let saturation = saturationFromLevel(780, 0, 0);
  let simTimeH = 0;
  const rainNoise = createOuProcess(1.2, 0.22, 1, rng);

  const snapshot = (inputs: PhysicsInputs, rainMmH: number, inflowM3s: number): PhysicsState => {
    const levelM = levelFromVolume(volume);
    const spill = weirDischargeM3s(levelM);
    const fs = computeSafetyFactor(levelM, saturation, inputs.seismic, inputs.seepageFlowLMin);
    const piezo = Math.min(1, Math.max(0, saturation * 0.92 + inputs.seepageFlowLMin / 80));
    return {
      levelM,
      volumeM3: volume,
      rainMmH,
      inflowM3s,
      spillM3s: spill,
      spillHeadM: Math.max(0, levelM - SPILLWAY_CREST_M),
      spillSeverity: spillSeverityFromDischarge(spill),
      saturation,
      safetyFactor: fs,
      seepageFlowLMin: inputs.seepageFlowLMin,
      piezometricPressure: piezo,
      simTimeHours: simTimeH,
    };
  };

  let lastState: PhysicsState = snapshot(
    { fillRateM3Day: 0, rainPeakMmH: 0, stormActive: false, seismic: 0, seepageFlowLMin: 0 },
    0,
    0
  );

  return {
    reset: (levelM: number) => {
      volume = volumeFromLevel(levelM);
      saturation = saturationFromLevel(levelM, 0, 0);
      simTimeH = 0;
      rainNoise.reset();
      lastState = snapshot(
        { fillRateM3Day: 0, rainPeakMmH: 0, stormActive: false, seismic: 0, seepageFlowLMin: 0 },
        0,
        0
      );
    },
    step: (inputs, dtSimSeconds) => {
      let remaining = Math.max(0, dtSimSeconds);
      let rainMmH = lastState.rainMmH;
      let inflowM3s = lastState.inflowM3s;

      while (remaining > 0) {
        const dt = Math.min(remaining, MAX_SUBSTEP_S);
        remaining -= dt;
        simTimeH += dt / 3600;

        // Lluvia: hietograma con ruido cuando hay tormenta activa; constante en preview.
        if (inputs.rainPeakMmH <= 0) {
          rainMmH = 0;
        } else if (inputs.stormActive) {
          const noise = Math.max(0.3, rainNoise.step(dt));
          rainMmH = Math.max(0, inputs.rainPeakMmH * stormEnvelope(simTimeH) * noise);
        } else {
          rainMmH = inputs.rainPeakMmH;
        }

        const levelM = levelFromVolume(volume);

        // Entradas (m³/s)
        const qFill = inputs.fillRateM3Day / 86_400;
        const catchmentM2 = BASIN_AREA_M2 * CATCHMENT_RATIO;
        const qRain = (rainMmH / 1000 / 3600) * catchmentM2 * RUNOFF_COEFFICIENT;
        inflowM3s = qFill + qRain;

        // Salidas (m³/s)
        const qWeir = weirDischargeM3s(levelM);
        const pondArea = surfaceAreaAtLevel(levelM);
        const qEvap = (EVAPORATION_MM_DAY / 1000 / 86_400) * pondArea;
        const head = Math.max(0, levelM - RELAVE_MIN_M);
        const qInfil = (BASE_INFILTRATION_M3_DAY_PER_M * head) / 86_400;
        const qSeepage = inputs.seepageFlowLMin / 60_000;

        volume = Math.max(0, volume + (inflowM3s - qWeir - qEvap - qInfil - qSeepage) * dt);
        // La cota no puede superar el límite del visor aunque la entrada sea absurda.
        volume = Math.min(volume, volumeFromLevel(OVERFLOW_SIM_MAX_M));

        // Saturación del cuerpo del dique: retardo de primer orden hacia el objetivo.
        const targetSat = saturationFromLevel(levelFromVolume(volume), rainMmH, inputs.seepageFlowLMin);
        const alpha = 1 - Math.exp(-(dt / 3600) / SATURATION_TAU_H);
        saturation += (targetSat - saturation) * alpha;
      }

      lastState = snapshot(inputs, rainMmH, inflowM3s);
      return lastState;
    },
    getState: () => lastState,
  };
}
