"use client";

import { useEffect, useState } from "react";
import { ApiError, apiJson, withQuery } from "@/lib/api/http";
import type { PageResponse } from "@/lib/api/page";
import { labelSensorType } from "@/lib/ui/labels";

export type SensorNodeOption = {
  id: string;
  name: string;
  externalId?: string;
  sensorType?: string;
};

function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export function formatNodeOptionLabel(n: SensorNodeOption): string {
  const type = n.sensorType ? labelSensorType(n.sensorType) : null;
  const ref = n.externalId ?? shortId(n.id);
  return type ? `${n.name} — ${type} (${ref})` : `${n.name} (${ref})`;
}

export function useSensorNodeOptions(enabled = true) {
  const [nodes, setNodes] = useState<SensorNodeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    setLoading(true);
    setError(null);
    apiJson<PageResponse<SensorNodeOption>>(withQuery("nodes", { page: 0, limit: 200 }))
      .then((res) => setNodes(res.content))
      .catch((e: unknown) => {
        setNodes([]);
        setError(e instanceof ApiError ? `Error ${e.status}` : "No se pudieron cargar nodos");
      })
      .finally(() => setLoading(false));
  }, [enabled]);

  return { nodes, loading, error };
}
