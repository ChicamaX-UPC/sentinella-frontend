import { describe, expect, it } from "vitest";
import { parseWsMessage } from "./parse-message";

describe("parseWsMessage (telemetria / alertas WS)", () => {
  it("parses sensor.reading envelope", () => {
    const p = parseWsMessage(
      JSON.stringify({
        event: "sensor.reading",
        nodeId: "N-1",
        data: { value: 12.3 },
      })
    );
    expect(p?.event).toBe("sensor.reading");
    expect(p?.payload.nodeId).toBe("N-1");
  });

  it("returns null on invalid json", () => {
    expect(parseWsMessage("not-json")).toBeNull();
  });
});
