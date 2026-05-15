"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { RegisterNodeModal } from "@/components/admin/RegisterNodeModal";
import { MonitoringNodeDetailModal } from "@/components/monitoring/MonitoringNodeDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError, apiJson } from "@/lib/api/http";
import { labelSensorType } from "@/lib/ui/labels";
import { useSessionStore } from "@/stores/useSessionStore";

type SensorNode = {
  id: string;
  externalId?: string;
  name: string;
  tailingDamId?: string;
  sensorType?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  status?: string;
  lastSeen?: string;
};

export default function MonitoringPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl p-8 text-center text-slate-500">Cargando monitoreo…</div>}>
      <MonitoringPageContent />
    </Suspense>
  );
}

function MonitoringPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSessionStore((s) => s.user);
  const isAdmin = user?.role === "SYSTEM_ADMIN";

  const [nodes, setNodes] = useState<SensorNode[]>([]);
  const [error, setError] = useState<string | null>(null);

  const detailId = searchParams.get("nodo");
  const registerOpen = searchParams.get("registrarNodo") === "1";

  const loadNodes = useCallback(() => {
    setError(null);
    apiJson<SensorNode[]>("nodes")
      .then(setNodes)
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar nodos");
      });
  }, []);

  useEffect(() => {
    useSessionStore.getState().hydrate();
  }, []);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  function clearQueryParams() {
    router.replace("/monitoring", { scroll: false });
  }

  function openDetail(id: string) {
    router.replace(`/monitoring?nodo=${encodeURIComponent(id)}`, { scroll: false });
  }

  function closeDetail() {
    clearQueryParams();
  }

  function openRegister() {
    router.replace("/monitoring?registrarNodo=1", { scroll: false });
  }

  function closeRegister() {
    clearQueryParams();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Monitoreo de nodos"
        description="Telemetría por nodo del tranque. Abre el detalle para ver lecturas; el mapa está en Inicio."
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard#mapa-nodos"
          className="text-sm text-accent hover:text-accent-hover hover:underline"
        >
          Ver mapa en el panel ejecutivo →
        </Link>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => openRegister()}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover"
          >
            Registrar nodo
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-amber-400">{error}</p> : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {nodes.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => openDetail(n.id)}
            className="rounded-xl border border-white/10 bg-surface-elevated/50 p-4 text-left transition-colors hover:border-accent/40 hover:bg-surface-elevated/80"
          >
            <p className="font-semibold text-slate-100">{n.name}</p>
            <p className="mt-1 font-mono text-[11px] text-slate-500">{n.externalId ?? `${n.id.slice(0, 8)}…`}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {n.sensorType ? (
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-slate-300">{labelSensorType(n.sensorType)}</span>
              ) : null}
              {n.status ? (
                <span className="rounded-md bg-accent/10 px-2 py-0.5 text-accent/90">{n.status}</span>
              ) : null}
            </div>
            {n.lastSeen ? <p className="mt-2 text-[11px] text-slate-500">Última señal: {n.lastSeen}</p> : null}
            <p className="mt-3 text-xs text-accent/80">Ver detalle →</p>
          </button>
        ))}
      </div>

      {nodes.length === 0 && !error ? (
        <p className="mt-8 text-center text-sm text-slate-500">No hay nodos registrados para tu tranque.</p>
      ) : null}

      <MonitoringNodeDetailModal nodeId={detailId} open={Boolean(detailId)} onClose={closeDetail} />

      <RegisterNodeModal
        open={registerOpen}
        onClose={closeRegister}
        onRegistered={() => {
          loadNodes();
        }}
      />
    </div>
  );
}
