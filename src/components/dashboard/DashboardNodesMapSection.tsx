"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ApiError, apiJson } from "@/lib/api/http";
import type { MapNodeMarker } from "@/components/monitoring/NodesMap";

const NodesMap = dynamic(() => import("@/components/monitoring/NodesMap").then((m) => m.NodesMap), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-500">Cargando mapa…</p>,
});

type NodesMapPayload = {
  nodes: Array<{
    nodeId: string;
    name: string;
    latitude: string | number | null;
    longitude: string | number | null;
    status?: string;
  }>;
};

export function DashboardNodesMapSection() {
  const [markers, setMarkers] = useState<MapNodeMarker[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<NodesMapPayload>("dashboard/nodes-map")
      .then((data) => {
        const list = (data.nodes ?? []).map((n) => ({
          nodeId: n.nodeId,
          name: n.name,
          latitude: Number(n.latitude),
          longitude: Number(n.longitude),
          status: n.status,
        }));
        setMarkers(list.filter((m) => !Number.isNaN(m.latitude) && !Number.isNaN(m.longitude)));
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "No se pudo cargar el mapa");
      });
  }, []);

  return (
    <>
      {error ? <p className="mb-2 text-sm text-amber-400">{error}</p> : null}
      <NodesMap nodes={markers} />
    </>
  );
}
