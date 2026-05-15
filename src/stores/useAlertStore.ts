import { create } from "zustand";

export interface AlertBrief {
  id: string;
  status: string;
  severity?: string;
  nodeId?: string;
}

interface AlertState {
  items: AlertBrief[];
  setItems: (items: AlertBrief[]) => void;
  upsert: (alert: AlertBrief) => void;
  applyWsPayload: (event: string, payload: Record<string, unknown>) => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  items: [],
  setItems: (items) => set({ items }),
  upsert: (alert) =>
    set({
      items: [alert, ...get().items.filter((a) => a.id !== alert.id)],
    }),
  applyWsPayload: (event, payload) => {
    if (event === "alert.created") {
      const id = String(payload.alertId ?? "");
      if (!id) {
        return;
      }
      get().upsert({
        id,
        status: "ACTIVE",
        severity: typeof payload.severity === "string" ? payload.severity : undefined,
        nodeId: typeof payload.nodeId === "string" ? payload.nodeId : undefined,
      });
      return;
    }
    if (event === "alert.updated") {
      const id = String(payload.alertId ?? "");
      if (!id) {
        return;
      }
      const status = typeof payload.status === "string" ? payload.status : "ACTIVE";
      get().upsert({
        id,
        status,
        nodeId: typeof payload.nodeId === "string" ? payload.nodeId : undefined,
      });
    }
  },
}));
