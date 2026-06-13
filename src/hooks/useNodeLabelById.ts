"use client";

import { useCallback, useMemo } from "react";
import { formatNodeOptionLabel, useSensorNodeOptions } from "@/hooks/useSensorNodeOptions";
import { shortEntityId } from "@/lib/ui/tailing-dam-labels";

export function useNodeLabelById(enabled = true) {
  const { nodes, loading, error } = useSensorNodeOptions(enabled);

  const nodeLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of nodes) {
      map.set(node.id, formatNodeOptionLabel(node));
    }
    return map;
  }, [nodes]);

  const getNodeLabel = useCallback(
    (nodeId: string | null | undefined, fallback = "—"): string => {
      if (!nodeId) {
        return fallback;
      }
      return nodeLabelById.get(nodeId) ?? shortEntityId(nodeId);
    },
    [nodeLabelById]
  );

  return { nodes, nodeLabelById, getNodeLabel, loading, error };
}
