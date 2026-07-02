/**
 * Lecturas sintéticas de los 13 sensores del gemelo a partir del estado físico.
 *
 * Cada instrumento tiene su propia dinámica:
 *  - NW-01 (nivel): cota del vaso + ruido de medición.
 *  - PI-01…05 (piezómetros): presión de poros con retardo de primer orden respecto
 *    al nivel/saturación + ruido OU; respuesta local a la filtración según zona.
 *  - IN-01…03 (inclinómetros): deriva acumulativa ligada a la degradación del FS.
 *  - PV-01 (pluviómetro): intensidad del hietograma + ruido.
 *  - PH-01 (pH): deriva lenta con sensibilidad a la lluvia.
 */
import {
  DESIGN_RAIN_MM_H,
  RAIN_WARNING_MM_H,
  RELAVE_MAX_OPERATING_M,
  RELAVE_MIN_M,
  OVERFLOW_SIM_MAX_M,
} from "@/components/DigitalTwin/constants";
import {
  createOuProcess,
  type OuProcess,
  type PhysicsState,
} from "@/components/DigitalTwin/physics/simulationPhysics";

export type ReadingStatus = "OK" | "WARNING" | "CRITICAL";

export type SyntheticReading = {
  blueprintId: string;
  sensorType: string;
  value: number;
  unit: string;
  status: ReadingStatus;
};

// Umbrales de estado por variable (coherentes con las reglas demo del backend).
export const LEVEL_WARNING_M = 784;
export const LEVEL_CRITICAL_M = RELAVE_MAX_OPERATING_M;
export const PRESSURE_WARNING_KPA = 100;
export const PRESSURE_CRITICAL_KPA = 120;
export const INCLINATION_WARNING_DEG = 0.25;
export const INCLINATION_CRITICAL_DEG = 0.4;
export const PH_WARNING_RANGE: [number, number] = [6.5, 8.5];
export const PH_CRITICAL_RANGE: [number, number] = [6.0, 9.0];

/** Coeficiente de respuesta piezométrica por posición (interior del muro > pie de talud). */
const PI_RESPONSE: Record<string, number> = {
  "PI-01": 0.95,
  "PI-02": 1.06,
  "PI-03": 1.0,
  "PI-04": 1.03,
  "PI-05": 0.93,
};

/** Zona de filtración → piezómetro que la registra localmente. */
const SEEPAGE_PI: Record<string, string> = {
  "Talud Sur (PI-01)": "PI-01",
  "Base Central (PI-03)": "PI-03",
  "Talud Norte (PI-05)": "PI-05",
};

/** Constante de tiempo de respuesta piezométrica (h simuladas). */
const PI_TAU_H = 6;
/** Deriva del inclinómetro cuando FS < 1.3 (grados por hora por unidad de déficit de FS). */
const INCLINATION_DRIFT_DEG_H = 0.02;
const MAX_INCLINATION_DEG = 1.5;
const MAX_PRESSURE_KPA = 400;
const MAX_LEVEL_M = OVERFLOW_SIM_MAX_M;
const MIN_LEVEL_M = RELAVE_MIN_M;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function safeValue(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function levelStatus(valueM: number): ReadingStatus {
  if (valueM >= LEVEL_CRITICAL_M) return "CRITICAL";
  if (valueM >= LEVEL_WARNING_M) return "WARNING";
  return "OK";
}

export function pressureStatus(valueKpa: number): ReadingStatus {
  if (valueKpa >= PRESSURE_CRITICAL_KPA) return "CRITICAL";
  if (valueKpa >= PRESSURE_WARNING_KPA) return "WARNING";
  return "OK";
}

export function rainStatus(valueMmH: number): ReadingStatus {
  if (valueMmH >= DESIGN_RAIN_MM_H) return "CRITICAL";
  if (valueMmH >= RAIN_WARNING_MM_H) return "WARNING";
  return "OK";
}

export function inclinationStatus(valueDeg: number): ReadingStatus {
  if (valueDeg >= INCLINATION_CRITICAL_DEG) return "CRITICAL";
  if (valueDeg >= INCLINATION_WARNING_DEG) return "WARNING";
  return "OK";
}

export function phStatus(value: number): ReadingStatus {
  if (value < PH_CRITICAL_RANGE[0] || value > PH_CRITICAL_RANGE[1]) return "CRITICAL";
  if (value < PH_WARNING_RANGE[0] || value > PH_WARNING_RANGE[1]) return "WARNING";
  return "OK";
}

/** Presión de poros objetivo (kPa) para un piezómetro dado el estado físico. */
export function porePressureTarget(
  blueprintId: string,
  levelM: number,
  saturation: number,
  seepageFlowLMin: number,
  seepageLocation: string
): number {
  const coef = PI_RESPONSE[blueprintId] ?? 1;
  const headM = Math.max(0, levelM - RELAVE_MIN_M);
  const base = headM * 9.81 * coef * (0.55 + 0.45 * saturation);
  const localSeepage = SEEPAGE_PI[seepageLocation] === blueprintId ? seepageFlowLMin * 0.45 : seepageFlowLMin * 0.08;
  return base + localSeepage;
}

export type SensorSimulator = {
  /** Avanza dtSimSeconds y devuelve las 11 lecturas del gemelo. */
  update: (phys: PhysicsState, seepageLocation: string, dtSimSeconds: number) => SyntheticReading[];
  /** Última lectura por blueprintId. */
  readings: () => ReadonlyMap<string, SyntheticReading>;
  reset: (phys: PhysicsState, seepageLocation: string) => void;
};

export function createSensorSimulator(rng: () => number = Math.random): SensorSimulator {
  const piIds = Object.keys(PI_RESPONSE);
  const inIds = ["IN-01", "IN-02", "IN-03"];

  const piState = new Map<string, number>();
  const piNoise = new Map<string, OuProcess>();
  for (const id of piIds) {
    piState.set(id, 0);
    piNoise.set(id, createOuProcess(2.5, 1.1, 0, rng));
  }

  const inDrift = new Map<string, number>();
  const inNoise = new Map<string, OuProcess>();
  inIds.forEach((id, i) => {
    inDrift.set(id, 0.1 + i * 0.015);
    inNoise.set(id, createOuProcess(2.0, 0.006, 0, rng));
  });

  const levelNoise = createOuProcess(4.0, 0.015, 0, rng);
  const rainNoise = createOuProcess(3.0, 0.6, 0, rng);
  const phNoise = createOuProcess(0.4, 0.05, 0, rng);

  const last = new Map<string, SyntheticReading>();

  const put = (r: SyntheticReading) => {
    last.set(r.blueprintId, r);
    return r;
  };

  const compute = (phys: PhysicsState, seepageLocation: string, dtSimSeconds: number): SyntheticReading[] => {
    const dt = Math.max(0, dtSimSeconds);
    const dtH = dt / 3600;
    const out: SyntheticReading[] = [];

    // NW-01 — nivel del vaso
    const level = clamp(
      safeValue(phys.levelM + levelNoise.step(dt), phys.levelM),
      MIN_LEVEL_M,
      MAX_LEVEL_M
    );
    out.push(
      put({
        blueprintId: "NW-01",
        sensorType: "water_level",
        value: Number(level.toFixed(2)),
        unit: "msnm",
        status: levelStatus(level),
      })
    );

    // PI-01…05 — presión de poros con retardo de primer orden
    const alphaPi = dt > 0 ? 1 - Math.exp(-dtH / PI_TAU_H) : 1;
    for (const id of piIds) {
      const target = porePressureTarget(id, phys.levelM, phys.saturation, phys.seepageFlowLMin, seepageLocation);
      const prev = piState.get(id) ?? target;
      const next = dt > 0 ? prev + (target - prev) * alphaPi : target;
      piState.set(id, next);
      const noisy = clamp(safeValue(next + (piNoise.get(id)?.step(dt) ?? 0), next), 0, MAX_PRESSURE_KPA);
      out.push(
        put({
          blueprintId: id,
          sensorType: "pressure",
          value: Number(noisy.toFixed(1)),
          unit: "kPa",
          status: pressureStatus(noisy),
        })
      );
    }

    // IN-01…03 — inclinación con deriva acumulativa si el FS se degrada
    const fsDeficit = Math.max(0, 1.3 - phys.safetyFactor);
    for (const id of inIds) {
      const drift = clamp(
        safeValue((inDrift.get(id) ?? 0.1) + fsDeficit * INCLINATION_DRIFT_DEG_H * dtH, inDrift.get(id) ?? 0.1),
        0,
        MAX_INCLINATION_DEG
      );
      inDrift.set(id, drift);
      const noisy = clamp(safeValue(drift + (inNoise.get(id)?.step(dt) ?? 0), drift), 0, MAX_INCLINATION_DEG);
      out.push(
        put({
          blueprintId: id,
          sensorType: "inclination",
          value: Number(noisy.toFixed(3)),
          unit: "deg",
          status: inclinationStatus(noisy),
        })
      );
    }

    // PV-01 — intensidad de lluvia
    const rain = clamp(safeValue(phys.rainMmH + (phys.rainMmH > 0 ? rainNoise.step(dt) : 0), phys.rainMmH), 0, 120);
    out.push(
      put({
        blueprintId: "PV-01",
        sensorType: "pluviometer",
        value: Number(rain.toFixed(1)),
        unit: "mm/h",
        status: rainStatus(rain),
      })
    );

    // PH-01 — pH de la poza de decantación (lluvia ácida de escorrentía lo baja levemente)
    const ph = clamp(safeValue(7.1 + phNoise.step(dt) - phys.rainMmH * 0.004, 7.1), 5.5, 9.5);
    out.push(
      put({
        blueprintId: "PH-01",
        sensorType: "ph",
        value: Number(ph.toFixed(2)),
        unit: "pH",
        status: phStatus(ph),
      })
    );

    return out;
  };

  return {
    update: compute,
    readings: () => last,
    reset: (phys, seepageLocation) => {
      levelNoise.reset();
      rainNoise.reset();
      phNoise.reset();
      piNoise.forEach((n) => n.reset());
      inNoise.forEach((n) => n.reset());
      inIds.forEach((id, i) => inDrift.set(id, 0.1 + i * 0.015));
      for (const id of piIds) {
        piState.set(
          id,
          porePressureTarget(id, phys.levelM, phys.saturation, phys.seepageFlowLMin, seepageLocation)
        );
      }
      last.clear();
      compute(phys, seepageLocation, 0);
    },
  };
}
