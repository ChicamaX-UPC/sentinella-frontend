import { describe, expect, it } from "vitest";
import {
  createSensorSimulator,
  inclinationStatus,
  levelStatus,
  phStatus,
  porePressureTarget,
  pressureStatus,
  rainStatus,
} from "@/components/DigitalTwin/physics/sensorSimulation";
import { createTwinPhysics } from "@/components/DigitalTwin/physics/simulationPhysics";

function seededRng(seed = 7): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s % 10_000) / 10_000 || 0.5;
  };
}

describe("estados por umbral", () => {
  it("nivel: OK < 784 ≤ WARNING < 785 ≤ CRITICAL", () => {
    expect(levelStatus(780)).toBe("OK");
    expect(levelStatus(784.2)).toBe("WARNING");
    expect(levelStatus(786.1)).toBe("CRITICAL");
  });

  it("presión: CRITICAL ≥ 120 kPa (alineado con la regla backend GT 120)", () => {
    expect(pressureStatus(80)).toBe("OK");
    expect(pressureStatus(105)).toBe("WARNING");
    expect(pressureStatus(125)).toBe("CRITICAL");
  });

  it("lluvia: CRITICAL en el caudal de diseño (45 mm/h)", () => {
    expect(rainStatus(10)).toBe("OK");
    expect(rainStatus(35)).toBe("WARNING");
    expect(rainStatus(50)).toBe("CRITICAL");
  });

  it("inclinación y pH", () => {
    expect(inclinationStatus(0.1)).toBe("OK");
    expect(inclinationStatus(0.3)).toBe("WARNING");
    expect(inclinationStatus(0.5)).toBe("CRITICAL");
    expect(phStatus(7.1)).toBe("OK");
    expect(phStatus(6.2)).toBe("WARNING");
    expect(phStatus(5.5)).toBe("CRITICAL");
  });
});

describe("presión de poros", () => {
  it("crece con la cota y la saturación", () => {
    const low = porePressureTarget("PI-03", 778, 0.3, 0, "Base Central (PI-03)");
    const high = porePressureTarget("PI-03", 786, 0.95, 0, "Base Central (PI-03)");
    expect(high).toBeGreaterThan(low);
  });

  it("en condición de desborde saturado supera el umbral crítico (120 kPa)", () => {
    const p = porePressureTarget("PI-02", 786.2, 1, 0, "Base Central (PI-03)");
    expect(p).toBeGreaterThan(120);
  });

  it("la filtración se registra localmente en el piezómetro de la zona", () => {
    const local = porePressureTarget("PI-01", 780, 0.5, 30, "Talud Sur (PI-01)");
    const remote = porePressureTarget("PI-05", 780, 0.5, 30, "Talud Sur (PI-01)");
    expect(local).toBeGreaterThan(remote + 5);
  });
});

describe("simulador de sensores", () => {
  it("produce las 11 lecturas del gemelo con tipos backend correctos", () => {
    const phys = createTwinPhysics(seededRng());
    phys.reset(780);
    const sim = createSensorSimulator(seededRng());
    sim.reset(phys.getState(), "Base Central (PI-03)");
    const readings = sim.update(phys.getState(), "Base Central (PI-03)", 60);

    expect(readings).toHaveLength(11);
    const byId = new Map(readings.map((r) => [r.blueprintId, r]));
    expect(byId.get("NW-01")?.sensorType).toBe("water_level");
    expect(byId.get("NW-01")?.unit).toBe("msnm");
    expect(byId.get("PI-03")?.sensorType).toBe("pressure");
    expect(byId.get("IN-02")?.sensorType).toBe("inclination");
    expect(byId.get("PV-01")?.sensorType).toBe("pluviometer");
    expect(byId.get("PH-01")?.sensorType).toBe("ph");
  });

  it("en desborde, NW-01 reporta CRITICAL y los piezómetros escalan", () => {
    const phys = createTwinPhysics(seededRng());
    phys.reset(785.8);
    const sim = createSensorSimulator(seededRng());
    sim.reset(phys.getState(), "Base Central (PI-03)");

    let readings = sim.update(phys.getState(), "Base Central (PI-03)", 0);
    let state = phys.getState();
    for (let i = 0; i < 24; i += 1) {
      state = phys.step(
        { fillRateM3Day: 110, rainPeakMmH: 60, stormActive: true, seismic: 0, seepageFlowLMin: 0 },
        3600
      );
      readings = sim.update(state, "Base Central (PI-03)", 3600);
    }

    const byId = new Map(readings.map((r) => [r.blueprintId, r]));
    expect(byId.get("NW-01")?.status).toBe("CRITICAL");
    const pi02 = byId.get("PI-02");
    expect(pi02).toBeDefined();
    expect(pi02!.value).toBeGreaterThan(100);
  });

  it("el nivel medido sigue la cota física con ruido acotado", () => {
    const phys = createTwinPhysics(seededRng());
    phys.reset(782);
    const sim = createSensorSimulator(seededRng());
    sim.reset(phys.getState(), "Base Central (PI-03)");
    const readings = sim.update(phys.getState(), "Base Central (PI-03)", 300);
    const nw = readings.find((r) => r.blueprintId === "NW-01");
    expect(nw).toBeDefined();
    expect(Math.abs(nw!.value - 782)).toBeLessThan(0.3);
  });

  it("permanece finito con pasos largos (simula velocidad x30)", () => {
    const phys = createTwinPhysics(seededRng());
    phys.reset(785.5);
    const sim = createSensorSimulator(seededRng());
    sim.reset(phys.getState(), "Base Central (PI-03)");
    let state = phys.getState();
    for (let i = 0; i < 50; i += 1) {
      state = phys.step(
        { fillRateM3Day: 110, rainPeakMmH: 60, stormActive: true, seismic: 0, seepageFlowLMin: 0 },
        7200
      );
      const readings = sim.update(state, "Base Central (PI-03)", 7200);
      for (const r of readings) {
        expect(Number.isFinite(r.value)).toBe(true);
        if (r.sensorType === "pressure") expect(r.value).toBeLessThanOrEqual(400);
        if (r.sensorType === "inclination") expect(r.value).toBeLessThanOrEqual(1.5);
      }
    }
  });
});
