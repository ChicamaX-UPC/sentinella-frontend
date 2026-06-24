import { describe, expect, it } from "vitest";
import {
  computeHydraulicAlert,
  computeStructuralAlert,
  shouldShowHydraulicLayers,
} from "@/components/DigitalTwin/scene/AlertSemantics";

describe("alert semantics", () => {
  it("does not treat FS critical as hydraulic overflow", () => {
    const structural = computeStructuralAlert(0.95);
    const hydraulic = computeHydraulicAlert(2, 0);
    expect(structural.fsCritical).toBe(true);
    expect(hydraulic.activeOverflow).toBe(false);
    expect(shouldShowHydraulicLayers(hydraulic)).toBe(false);
  });

  it("activates hydraulic layers when freeboard is negative", () => {
    const hydraulic = computeHydraulicAlert(-0.5, 0.33);
    expect(hydraulic.activeOverflow).toBe(true);
    expect(shouldShowHydraulicLayers(hydraulic)).toBe(true);
  });
});
