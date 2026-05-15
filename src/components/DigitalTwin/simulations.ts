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

export type TwinSimulation = {
  id: "WATER_LEVEL_RISE" | "HEAVY_RAIN" | "DIKE_SATURATION" | "SAFETY_FACTOR" | "SEEPAGE_DETECTION";
  label: string;
  controls: SimulationControl[];
};

export const TWIN_SIMULATIONS: TwinSimulation[] = [
  {
    id: "WATER_LEVEL_RISE",
    label: "Subida de nivel",
    controls: [
      { key: "fillRate", label: "Tasa de llenado", type: "range", min: 0, max: 220, step: 1, unit: "m³/día" },
      { key: "relaveLevel", label: "Nivel base", type: "range", min: 774, max: 787.5, step: 0.1, unit: "msnm" },
    ],
  },
  {
    id: "HEAVY_RAIN",
    label: "Lluvia intensa",
    controls: [
      { key: "rainIntensity", label: "Intensidad de lluvia", type: "range", min: 0, max: 90, step: 1, unit: "mm/h" },
      { key: "relaveLevel", label: "Nivel base", type: "range", min: 774, max: 787.5, step: 0.1, unit: "msnm" },
    ],
  },
  {
    id: "DIKE_SATURATION",
    label: "Saturación del dique",
    controls: [{ key: "relaveLevel", label: "Nivel relave", type: "range", min: 774, max: 787.5, step: 0.1, unit: "msnm" }],
  },
  {
    id: "SAFETY_FACTOR",
    label: "Factor de seguridad",
    controls: [
      { key: "relaveLevel", label: "Nivel relave", type: "range", min: 774, max: 787.5, step: 0.1, unit: "msnm" },
      { key: "seismic", label: "Aceleración sísmica", type: "range", min: 0, max: 0.25, step: 0.01, unit: "g" },
    ],
  },
  {
    id: "SEEPAGE_DETECTION",
    label: "Filtración",
    controls: [
      { key: "seepageFlow", label: "Caudal de filtración", type: "range", min: 0, max: 50, step: 1, unit: "L/min" },
      {
        key: "seepageLocation",
        label: "Zona de filtración",
        type: "select",
        options: ["Talud Sur (PI-01)", "Base Central (PI-03)", "Talud Norte (PI-05)"],
      },
    ],
  },
];
