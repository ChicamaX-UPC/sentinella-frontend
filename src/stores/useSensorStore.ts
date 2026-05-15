import { create } from "zustand";

export interface SensorReadingPayload {
  nodeId: string;
  timestamp?: string;
  type?: string;
  value?: number;
  unit?: string;
  status?: string;
}

interface SensorState {
  lastByNode: Record<string, SensorReadingPayload>;
  applyReading: (payload: Record<string, unknown>) => void;
}

export const useSensorStore = create<SensorState>((set) => ({
  lastByNode: {},
  applyReading: (payload) => {
    const nodeId = typeof payload.nodeId === "string" ? payload.nodeId : undefined;
    if (!nodeId) {
      return;
    }
    const next: SensorReadingPayload = {
      nodeId,
      timestamp: typeof payload.timestamp === "string" ? payload.timestamp : undefined,
      type: typeof payload.type === "string" ? payload.type : undefined,
      value: typeof payload.value === "number" ? payload.value : undefined,
      unit: typeof payload.unit === "string" ? payload.unit : undefined,
      status: typeof payload.status === "string" ? payload.status : undefined,
    };
    set((s) => ({
      lastByNode: { ...s.lastByNode, [nodeId]: next },
    }));
  },
}));
