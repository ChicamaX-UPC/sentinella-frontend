/**
 * Parámetros del expediente técnico — ChicamaX §9.2 (Plano P-04, P-05, P-09).
 */
import * as THREE from "three";

export const CROWN_ELEVATION_M = 786;
export const RELAVE_MIN_M = 774;
export const RELAVE_MAX_OPERATING_M = 785;
export const OVERFLOW_SIM_MAX_M = 787.5;
export const MIN_FREEBOARD_M = 1.0;
export const BASIN_AREA_M2 = 17_000;
export const BASIN_VOLUME_M3 = 57_000;
export const DAM_VOLUME_M3 = 14_500;
export const DESIGN_FILL_RATE_M3_DAY = 60;
export const DESIGN_RAIN_MM_H = 45;
export const RAIN_WARNING_MM_H = 30;
export const CORONATION_CHANNEL_M = 140;
export const DAM_HEIGHT_M = 12;
export const SLOPE_H_TO_V = 1.8;
export const FS_OK = 1.5;
export const FS_WARNING = 1.2;
export const FS_CRITICAL = 1.0;
export const SEEPAGE_WARNING_L_MIN = 5;
export const SEEPAGE_CRITICAL_L_MIN = 20;
export const SATURATION_WARNING = 0.6;
export const SATURATION_CRITICAL = 0.85;
/** Segundos reales ≈ 1 día simulado a velocidad x1 (compresión temporal para el visor). */
export const SIM_DAY_DURATION_SEC = 8;
export const CATCHMENT_RATIO = 2.8;

export const BOWL_CX = 6;
export const BOWL_CZ = 22;
export const BASIN_FLOOR_Y = 0.4;

/** msnm → altura Y en escena Three.js (corona ≈ Y 10.4–10.5). */
export function relaveMsnmToSurfaceY(levelM: number): number {
  const L = THREE.MathUtils.clamp(levelM, RELAVE_MIN_M, OVERFLOW_SIM_MAX_M);
  if (L <= 780) {
    return THREE.MathUtils.lerp(1.0, 5.0, (L - RELAVE_MIN_M) / 6);
  }
  if (L <= RELAVE_MAX_OPERATING_M) {
    return THREE.MathUtils.lerp(5.0, 9.2, (L - 780) / 5);
  }
  if (L <= CROWN_ELEVATION_M) {
    return THREE.MathUtils.lerp(9.2, 10.4, (L - RELAVE_MAX_OPERATING_M) / (CROWN_ELEVATION_M - RELAVE_MAX_OPERATING_M));
  }
  return THREE.MathUtils.lerp(10.4, 11.2, (L - CROWN_ELEVATION_M) / (OVERFLOW_SIM_MAX_M - CROWN_ELEVATION_M));
}

export function computeFreeboard(relaveLevelM: number): number {
  return CROWN_ELEVATION_M - relaveLevelM;
}

/** Subida de cota por tasa de llenado (m³/día) en un paso de simulación. */
export function levelRiseFromFillRate(fillRateM3Day: number, deltaSec: number, playbackSpeed: number): number {
  const simDays = (deltaSec * playbackSpeed) / SIM_DAY_DURATION_SEC;
  return (fillRateM3Day / BASIN_AREA_M2) * simDays;
}

/** Contribución de lluvia intensa (mm/h) al nivel del vaso. */
export function levelRiseFromRain(rainMmH: number, deltaSec: number, playbackSpeed: number): number {
  const simHours = ((deltaSec * playbackSpeed) / SIM_DAY_DURATION_SEC) * 24;
  return (rainMmH / 1000) * CATCHMENT_RATIO * simHours * 0.012;
}

export function computeSafetyFactor(
  relaveLevel: number,
  saturation: number,
  seismic: number,
  seepageFlow: number
): number {
  const fsRaw =
    FS_OK +
    0.35 -
    saturation * 0.52 -
    seismic * 1.9 -
    (relaveLevel - 780) * 0.03 -
    seepageFlow * 0.008;
  return THREE.MathUtils.clamp(fsRaw, 0.75, 2.1);
}

export function saturationFromLevel(relaveLevel: number, rainIntensity: number, seepageFlow: number): number {
  const base = (relaveLevel - RELAVE_MIN_M) / (RELAVE_MAX_OPERATING_M - RELAVE_MIN_M);
  return THREE.MathUtils.clamp(base * 0.74 + (rainIntensity / 90) * 0.35 + (seepageFlow / 50) * 0.22, 0, 1);
}
