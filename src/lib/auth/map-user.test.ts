import { describe, expect, it } from "vitest";
import { mapUserResourceToSession } from "./map-user";

describe("mapUserResourceToSession (IAM / JWT login contract)", () => {
  it("maps backend user resource", () => {
    const u = mapUserResourceToSession({
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "m@example.com",
      fullName: "Maria",
      role: "PLANT_MANAGER",
      tailingDamIds: ["550e8400-e29b-41d4-a716-446655440001"],
      active: true,
    });
    expect(u.email).toBe("m@example.com");
    expect(u.role).toBe("PLANT_MANAGER");
    expect(u.tailingDamIds).toHaveLength(1);
    expect(u.active).toBe(true);
  });
});
