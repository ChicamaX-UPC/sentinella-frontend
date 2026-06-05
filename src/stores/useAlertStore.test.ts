import { describe, expect, it } from "vitest";
import { useAlertStore } from "./useAlertStore";

describe("useAlertStore", () => {
  it("applies alert.created from websocket payload", () => {
    useAlertStore.getState().setItems([]);
    useAlertStore.getState().applyWsPayload("alert.created", {
      event: "alert.created",
      alertId: "a1",
      severity: "CRITICAL",
      nodeId: "n1",
    });
    const items = useAlertStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("a1");
    expect(items[0].status).toBe("ACTIVE");
    expect(items[0].severity).toBe("CRITICAL");
  });

  it("applies alert.updated", () => {
    useAlertStore.getState().setItems([{ id: "a1", status: "ACTIVE" }]);
    useAlertStore.getState().applyWsPayload("alert.updated", {
      event: "alert.updated",
      alertId: "a1",
      status: "ACKNOWLEDGED",
    });
    expect(useAlertStore.getState().items[0].status).toBe("ACKNOWLEDGED");
  });
});
