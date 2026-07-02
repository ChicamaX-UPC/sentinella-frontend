import { describe, expect, it } from "vitest";
import {
  BASIN_VOLUME_M3,
  CROWN_ELEVATION_M,
  OVERFLOW_SIM_MAX_M,
  RELAVE_MAX_OPERATING_M,
  RELAVE_MIN_M,
} from "@/components/DigitalTwin/constants";
import {
  DESIGN_SPILL_CAPACITY_M3S,
  SPILLWAY_CREST_M,
  createOuProcess,
  createTwinPhysics,
  levelFromVolume,
  spillSeverityFromDischarge,
  stormEnvelope,
  surfaceAreaAtLevel,
  volumeFromLevel,
  weirDischargeM3s,
} from "@/components/DigitalTwin/physics/simulationPhysics";

/** RNG determinístico para tests reproducibles. */
function seededRng(seed = 42): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s % 10_000) / 10_000 || 0.5;
  };
}

describe("curva cota-volumen", () => {
  it("honra el volumen del expediente en el nivel máximo de operación", () => {
    const v = volumeFromLevel(RELAVE_MAX_OPERATING_M);
    expect(v).toBeGreaterThan(BASIN_VOLUME_M3 * 0.98);
    expect(v).toBeLessThan(BASIN_VOLUME_M3 * 1.02);
  });

  it("es monótona creciente y la inversa hace roundtrip", () => {
    let prev = -1;
    for (let level = RELAVE_MIN_M; level <= OVERFLOW_SIM_MAX_M; level += 0.5) {
      const v = volumeFromLevel(level);
      expect(v).toBeGreaterThan(prev);
      prev = v;
      expect(levelFromVolume(v)).toBeCloseTo(level, 4);
    }
  });

  it("el área del espejo crece con la cota", () => {
    expect(surfaceAreaAtLevel(780)).toBeLessThan(surfaceAreaAtLevel(785));
  });
});

describe("ecuación de vertedero", () => {
  it("no descarga en o por debajo de la cresta", () => {
    expect(weirDischargeM3s(SPILLWAY_CREST_M)).toBe(0);
    expect(weirDischargeM3s(SPILLWAY_CREST_M - 1)).toBe(0);
  });

  it("descarga crece monótonamente con la lámina (H^1.5)", () => {
    const q1 = weirDischargeM3s(SPILLWAY_CREST_M + 0.1);
    const q2 = weirDischargeM3s(SPILLWAY_CREST_M + 0.2);
    const q4 = weirDischargeM3s(SPILLWAY_CREST_M + 0.4);
    expect(q1).toBeGreaterThan(0);
    expect(q2).toBeGreaterThan(q1);
    expect(q4).toBeGreaterThan(q2);
    // H^1.5: duplicar la lámina multiplica el caudal por 2^1.5 ≈ 2.83
    expect(q2 / q1).toBeCloseTo(Math.pow(2, 1.5), 1);
  });

  it("severidad = 1 al alcanzar la capacidad de diseño", () => {
    expect(spillSeverityFromDischarge(0)).toBe(0);
    expect(spillSeverityFromDischarge(DESIGN_SPILL_CAPACITY_M3S)).toBe(1);
    expect(spillSeverityFromDischarge(DESIGN_SPILL_CAPACITY_M3S * 2)).toBe(1);
  });
});

describe("hietograma de tormenta", () => {
  it("la envolvente se mantiene en [0, 1] y alcanza el pico", () => {
    let max = 0;
    for (let h = 0; h < 16; h += 0.25) {
      const e = stormEnvelope(h);
      expect(e).toBeGreaterThanOrEqual(0);
      expect(e).toBeLessThanOrEqual(1);
      max = Math.max(max, e);
    }
    expect(max).toBe(1);
  });
});

describe("proceso OU", () => {
  it("permanece acotado con dt grande (velocidad x30)", () => {
    const ou = createOuProcess(4.0, 1.1, 0, seededRng());
    for (let i = 0; i < 1000; i += 1) {
      const v = ou.step(7200);
      expect(Number.isFinite(v)).toBe(true);
      expect(Math.abs(v)).toBeLessThan(50);
    }
  });
});

describe("balance hídrico", () => {
  it("sin entradas, el nivel decae lentamente (evaporación + infiltración)", () => {
    const phys = createTwinPhysics(seededRng());
    phys.reset(780);
    const before = phys.getState().levelM;
    const after = phys.step(
      { fillRateM3Day: 0, rainPeakMmH: 0, stormActive: false, seismic: 0, seepageFlowLMin: 0 },
      86_400 // 1 día simulado
    );
    expect(after.levelM).toBeLessThan(before);
    expect(before - after.levelM).toBeLessThan(0.05);
  });

  it("el llenado de diseño sube el nivel de forma consistente con el área", () => {
    const phys = createTwinPhysics(seededRng());
    phys.reset(780);
    const s = phys.step(
      { fillRateM3Day: 120, rainPeakMmH: 0, stormActive: false, seismic: 0, seepageFlowLMin: 0 },
      86_400
    );
    // ~120 m³ repartidos en ~10 000 m² de espejo → subida de mm, no de metros
    expect(s.levelM).toBeGreaterThan(780);
    expect(s.levelM).toBeLessThan(780.1);
  });

  it("el desborde EMERGE con tormenta extrema y nivel alto (no es un modo especial)", () => {
    const phys = createTwinPhysics(seededRng());
    phys.reset(785.8);
    let state = phys.getState();
    for (let i = 0; i < 24; i += 1) {
      state = phys.step(
        { fillRateM3Day: 110, rainPeakMmH: 60, stormActive: true, seismic: 0, seepageFlowLMin: 0 },
        3600 // 1 hora simulada por paso
      );
    }
    expect(state.levelM).toBeGreaterThan(CROWN_ELEVATION_M);
    expect(state.spillM3s).toBeGreaterThan(0);
    expect(state.spillSeverity).toBeGreaterThan(0.2);
  });

  it("el vertedero limita la cota: nunca supera el máximo del visor", () => {
    const phys = createTwinPhysics(seededRng());
    phys.reset(785.9);
    let state = phys.getState();
    for (let i = 0; i < 48; i += 1) {
      state = phys.step(
        { fillRateM3Day: 120, rainPeakMmH: 80, stormActive: false, seismic: 0, seepageFlowLMin: 0 },
        3600
      );
    }
    expect(state.levelM).toBeLessThanOrEqual(OVERFLOW_SIM_MAX_M);
    // Equilibrio: la descarga del vertedero compensa la entrada
    expect(state.spillM3s).toBeGreaterThan(0);
    expect(Math.abs(state.spillM3s - state.inflowM3s)).toBeLessThan(state.inflowM3s * 0.5);
  });

  it("la saturación responde con retardo, no instantáneamente", () => {
    const phys = createTwinPhysics(seededRng());
    phys.reset(778);
    const satBefore = phys.getState().saturation;
    const oneStep = phys.step(
      { fillRateM3Day: 0, rainPeakMmH: 60, stormActive: false, seismic: 0, seepageFlowLMin: 0 },
      600 // 10 min simulados
    );
    // En 10 min la saturación apenas se mueve (tau = 4 h)
    expect(Math.abs(oneStep.saturation - satBefore)).toBeLessThan(0.05);
  });
});
