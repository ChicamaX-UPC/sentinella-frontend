import { SimulationType } from "@/stores/useSimulationStore";

export type ApiSimulationScenario = {
  id: string;
  name: string;
  description?: string | null;
  simulationType: string;
  parameters: Record<string, unknown>;
  tailingDamId?: string;
  isPublic?: boolean;
  public?: boolean;
};

const SNAKE_TO_CAMEL: Record<string, string> = {
  fill_rate: "fillRate",
  rain_intensity: "rainIntensity",
  relave_level: "relaveLevel",
  seepage_flow: "seepageFlow",
  seepage_location: "seepageLocation",
  seismic: "seismic",
  delta_meters: "relaveLevel",
  deltameters: "relaveLevel",
};

const LOCATION_MAP: Record<string, string> = {
  "talud sur": "Talud Sur (PI-01)",
  "pi-01": "Talud Sur (PI-01)",
  "base central": "Base Central (PI-03)",
  "pi-03": "Base Central (PI-03)",
  "talud norte": "Talud Norte (PI-05)",
  "pi-05": "Talud Norte (PI-05)",
};

function normalizeSimulationType(raw: string): SimulationType {
  const upper = raw.trim().toUpperCase().replace(/-/g, "_");
  const allowed: SimulationType[] = [
    "WATER_LEVEL_RISE",
    "HEAVY_RAIN",
    "DIKE_SATURATION",
    "SAFETY_FACTOR",
    "SEEPAGE_DETECTION",
  ];
  return (allowed.find((t) => t === upper) ?? "WATER_LEVEL_RISE") as SimulationType;
}

function normalizeSeepageLocation(value: unknown): string {
  if (typeof value !== "string") {
    return "Base Central (PI-03)";
  }
  const key = value.toLowerCase();
  for (const [pattern, label] of Object.entries(LOCATION_MAP)) {
    if (key.includes(pattern)) {
      return label;
    }
  }
  return value;
}

export function apiParametersToTwinParams(parameters: Record<string, unknown>): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(parameters)) {
    const camel = SNAKE_TO_CAMEL[key.toLowerCase()] ?? key;
    if (camel === "seepageLocation") {
      out[camel] = normalizeSeepageLocation(value);
    } else if (typeof value === "number") {
      out[camel] = value;
    } else if (typeof value === "string" && !Number.isNaN(Number(value))) {
      out[camel] = Number(value);
    } else if (typeof value === "string") {
      out[camel] = value;
    }
  }
  if (typeof out.relaveLevel === "number" && out.relaveLevel < 700) {
    out.relaveLevel = 774 + out.relaveLevel;
  }
  return out;
}

export function adaptApiScenario(scenario: ApiSimulationScenario): {
  simulationType: SimulationType;
  params: Record<string, number | string>;
  name: string;
} {
  return {
    simulationType: normalizeSimulationType(scenario.simulationType),
    params: apiParametersToTwinParams(scenario.parameters ?? {}),
    name: scenario.name,
  };
}

export function scenarioIsPublic(s: ApiSimulationScenario): boolean {
  return Boolean(s.isPublic ?? s.public);
}
