"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Redirige enlaces antiguos `/alerts/[id]` al listado con modal. */
export default function AlertDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const alertId = typeof params?.alertId === "string" ? params.alertId : "";

  useEffect(() => {
    if (alertId) {
      router.replace(`/alerts?alerta=${encodeURIComponent(alertId)}`);
    } else {
      router.replace("/alerts");
    }
  }, [alertId, router]);

  return <p className="p-8 text-center text-sm text-slate-500">Abriendo alerta…</p>;
}
