import { describe, expect, it } from "vitest";
import { findWeirParameter, getDamCurve, getWeirOutlet } from "@/components/DigitalTwin/scene/DamGeometry";

describe("dam geometry weir", () => {
  it("places weir outlet at maximum Z along dam curve", () => {
    const curve = getDamCurve();
    const t = findWeirParameter();
    const outlet = getWeirOutlet();
    let maxZ = -Infinity;
    for (let i = 0; i <= 80; i += 1) {
      const p = curve.getPoint(i / 80);
      if (p.z > maxZ) maxZ = p.z;
    }
    expect(outlet.position.z).toBeCloseTo(maxZ, 1);
    expect(curve.getPoint(t).z).toBeCloseTo(maxZ, 1);
  });

  it("returns stable outward vector", () => {
    const a = getWeirOutlet();
    const b = getWeirOutlet();
    expect(a.outward.length()).toBeCloseTo(1, 5);
    expect(a.outward.x).toBeCloseTo(b.outward.x, 5);
    expect(a.outward.z).toBeCloseTo(b.outward.z, 5);
  });
});
