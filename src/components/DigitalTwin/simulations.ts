import {
  CROWN_ELEVATION_M,
  DESIGN_FILL_RATE_M3_DAY,
  DESIGN_RAIN_MM_H,
  OVERFLOW_SIM_MAX_M,
  RELAVE_MAX_OPERATING_M,
  RELAVE_MIN_M,
} from "@/components/DigitalTwin/constants";

export type SimulationControl = {
  key: string;
  label: string;
  type: "range" | "select";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: string[];
};

export type ScenarioThresholds = {
  warning?: Record<string, number>;
  critical?: Record<string, number>;
};

export type TwinSimulation = {
  id:
    | "WATER_LEVEL_RISE"
    | "HEAVY_RAIN"
    | "DIKE_SATURATION"
    | "SAFETY_FACTOR"
    | "SEEPAGE_DETECTION"
    | "OVERFLOW_DEMO";
  label: string;
  description: string;
  controls: SimulationControl[];
  thresholds: ScenarioThresholds;
  affectedSensors: string[];
};

export const TWIN_SIMULATIONS: TwinSimulation[] = [
  {
    id: "WATER_LEVEL_RISE",
    label: "Subida de nivel",
    description: "Llenado progresivo del vaso. Alerta cuando borde libre < 1 m (MINEM).",
    controls: [
      { key: "fillRate", label: "Tasa de llenado", type: "range", min: 0, max: 120, step: 1, unit: "m³/día" },
      { key: "relaveLevel", label: "Nivel base", type: "range", min: RELAVE_MIN_M, max: OVERFLOW_SIM_MAX_M, step: 0.1, unit: "msnm" },
    ],
    thresholds: { warning: { nivel: 784, borde_libre: 2 }, critical: { nivel: RELAVE_MAX_OPERATING_M, borde_libre: 1 } },
    affectedSensors: ["NW-01"],
  },
  {
    id: "HEAVY_RAIN",
    label: "Lluvia intensa",
    description: `Precipitación extrema. Caudal de diseño: ${DESIGN_RAIN_MM_H} mm/h.`,
    controls: [
      { key: "rainIntensity", label: "Intensidad de lluvia", type: "range", min: 0, max: 80, step: 1, unit: "mm/h" },
      { key: "relaveLevel", label: "Nivel base", type: "range", min: RELAVE_MIN_M, max: OVERFLOW_SIM_MAX_M, step: 0.1, unit: "msnm" },
    ],
    thresholds: { warning: { intensidad: 30 }, critical: { intensidad: DESIGN_RAIN_MM_H } },
    affectedSensors: ["PV-01", "NW-01"],
  },
  {
    id: "DIKE_SATURATION",
    label: "Saturación del dique",
    description: "Línea freática según nivel de relave en el cuerpo del dique.",
    controls: [{ key: "relaveLevel", label: "Nivel relave", type: "range", min: RELAVE_MIN_M, max: RELAVE_MAX_OPERATING_M, step: 0.1, unit: "msnm" }],
    thresholds: { warning: { presion_piezometrica: 0.6 }, critical: { presion_piezometrica: 0.85 } },
    affectedSensors: ["PI-01", "PI-02", "PI-03", "PI-04", "PI-05"],
  },
  {
    id: "SAFETY_FACTOR",
    label: "Factor de seguridad",
    description: "FS de estabilidad según nivel, saturación y sismo (diseño FS ≥ 1.5).",
    controls: [
      { key: "relaveLevel", label: "Nivel relave", type: "range", min: RELAVE_MIN_M, max: RELAVE_MAX_OPERATING_M, step: 0.1, unit: "msnm" },
      { key: "seismic", label: "Aceleración sísmica", type: "range", min: 0, max: 0.25, step: 0.01, unit: "g" },
    ],
    thresholds: { warning: { fs: 1.2 }, critical: { fs: 1.0 } },
    affectedSensors: ["PI-01", "PI-02", "PI-03", "PI-04", "PI-05", "IN-01", "IN-02", "IN-03"],
  },
  {
    id: "OVERFLOW_DEMO",
    label: "Desborde (tormenta + nivel alto)",
    description:
      "Nivel inicial alto + tormenta extrema: el vertedero entra en carga y el rebose emerge del balance hídrico (Q = C·L·H^1.5).",
    controls: [
      { key: "fillRate", label: "Tasa de llenado", type: "range", min: 0, max: 120, step: 1, unit: "m³/día" },
      { key: "rainIntensity", label: "Pico de tormenta", type: "range", min: 0, max: 80, step: 1, unit: "mm/h" },
      { key: "relaveLevel", label: "Nivel base", type: "range", min: 784, max: OVERFLOW_SIM_MAX_M, step: 0.1, unit: "msnm" },
    ],
    thresholds: { warning: { nivel: CROWN_ELEVATION_M - 0.5 }, critical: { nivel: CROWN_ELEVATION_M } },
    affectedSensors: ["NW-01", "PV-01"],
  },
  {
    id: "SEEPAGE_DETECTION",
    label: "Filtración",
    description: "Filtración puntual en la base del dique con localización por piezómetro.",
    controls: [
      { key: "seepageFlow", label: "Caudal de filtración", type: "range", min: 0, max: 50, step: 1, unit: "L/min" },
      {
        key: "seepageLocation",
        label: "Zona de filtración",
        type: "select",
        options: ["Talud Sur (PI-01)", "Base Central (PI-03)", "Talud Norte (PI-05)"],
      },
    ],
    thresholds: { warning: { caudal: 5 }, critical: { caudal: 20 } },
    affectedSensors: ["PI-01", "PI-02", "PI-03", "PI-04", "PI-05"],
  },
];

export const DEFAULT_TWIN_PARAMS: Record<string, number | string> = {
  fillRate: DESIGN_FILL_RATE_M3_DAY,
  rainIntensity: 20,
  relaveLevel: 780,
  seismic: 0,
  seepageFlow: 0,
  seepageLocation: "Base Central (PI-03)",
};

export const OVERFLOW_DEMO_PARAMS: Record<string, number | string> = {
  ...DEFAULT_TWIN_PARAMS,
  fillRate: 110,
  rainIntensity: 60,
  relaveLevel: 785.8,
};
