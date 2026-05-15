import { create } from "zustand";

interface NodeState {
  offlineNodeIds: string[];
  setOffline: (nodeId: string, offline: boolean) => void;
  applyWsPayload: (event: string, payload: Record<string, unknown>) => void;
}

export const useNodeStore = create<NodeState>((set, get) => ({
  offlineNodeIds: [],
  setOffline: (nodeId, offline) =>
    set({
      offlineNodeIds: offline
        ? [...new Set([...get().offlineNodeIds, nodeId])]
        : get().offlineNodeIds.filter((id) => id !== nodeId),
    }),
  applyWsPayload: (event, payload) => {
    const nodeId = typeof payload.nodeId === "string" ? payload.nodeId : "";
    if (!nodeId) {
      return;
    }
    if (event === "node.offline") {
      get().setOffline(nodeId, true);
    }
    if (event === "node.online") {
      get().setOffline(nodeId, false);
    }
  },
}));
