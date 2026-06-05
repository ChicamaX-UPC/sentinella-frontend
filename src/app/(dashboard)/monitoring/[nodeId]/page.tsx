"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MonitoringNodeLegacyRedirect() {
  const params = useParams();
  const router = useRouter();
  const nodeId = typeof params?.nodeId === "string" ? params.nodeId : "";

  useEffect(() => {
    if (nodeId) {
      router.replace(`/monitoring?nodo=${encodeURIComponent(nodeId)}`);
    } else {
      router.replace("/monitoring");
    }
  }, [nodeId, router]);

  return (
    <div className="p-8 text-center text-sm text-slate-500">
      Abriendo detalle del nodo…
    </div>
  );
}
