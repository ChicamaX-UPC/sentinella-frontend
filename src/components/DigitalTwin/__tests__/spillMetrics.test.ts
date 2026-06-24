import { describe, expect, it } from "vitest";
import { computeHydraulicAlert } from "@/components/DigitalTwin/scene/AlertSemantics";

describe("spill metrics", () => {
  it("maps freeboard -1.5 m to spillSeverity 1 and spillM 1.5", () => {
    const h = computeHydraulicAlert(-1.5, 0);
    expect(h.spillM).toBeCloseTo(1.5);
    expect(h.spillSeverity).toBeCloseTo(1);
    expect(h.activeOverflow).toBe(true);
  });

  it("flags low freeboard below MINEM threshold", () => {
    const h = computeHydraulicAlert(0.6, 0);
    expect(h.lowFreeboard).toBe(true);
    expect(h.activeOverflow).toBe(false);
  });
});
