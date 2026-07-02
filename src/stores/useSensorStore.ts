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
  /** UUID de nodo → externalId (NW-01, PI-03…): permite resolver lecturas WS por ambos. */
  aliasById: Record<string, string>;
  registerNodeAliases: (nodes: Array<{ id: string; externalId?: string }>) => void;
  applyReading: (payload: Record<string, unknown>) => void;
}

export const useSensorStore = create<SensorState>((set, get) => ({
  lastByNode: {},
  aliasById: {},
  registerNodeAliases: (nodes) => {
    const aliasById: Record<string, string> = { ...get().aliasById };
    for (const node of nodes) {
      if (node.externalId) {
        aliasById[node.id] = node.externalId;
      }
    }
    set({ aliasById });
  },
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
    set((s) => {
      const lastByNode = { ...s.lastByNode, [nodeId]: next };
      // Indexar también por externalId para que el gemelo resuelva NW-01, PI-03, etc.
      const alias = s.aliasById[nodeId];
      if (alias) {
        lastByNode[alias] = next;
      }
      return { lastByNode };
    });
  },
}));
