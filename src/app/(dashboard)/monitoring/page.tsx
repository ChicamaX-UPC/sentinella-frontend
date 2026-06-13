"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { RegisterNodeModal } from "@/components/admin/RegisterNodeModal";
import { MonitoringNodeDetailModal } from "@/components/monitoring/MonitoringNodeDetailModal";
import { Pagination } from "@/components/ui/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError, apiJson, withQuery } from "@/lib/api/http";
import type { PageResponse } from "@/lib/api/page";
import { SENSOR_TYPES, labelSensorType, type SensorTypeCode } from "@/lib/ui/labels";
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
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sensorFilter, setSensorFilter] = useState<SensorTypeCode | "">("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "sensor-asc" | "last-seen-desc" | "last-seen-asc">(
    "name-asc"
  );

  const detailId = searchParams.get("nodo");
  const registerOpen = searchParams.get("registrarNodo") === "1";

  const loadNodes = useCallback(() => {
    setError(null);
    apiJson<PageResponse<SensorNode>>(withQuery("nodes", { page, limit: pageSize }))
      .then((res) => {
        setNodes(res.content);
        setTotalElements(res.totalElements);
        setTotalPages(res.totalPages);
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar nodos");
      });
  }, [page, pageSize]);

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

  const displayedNodes = [...nodes]
    .filter((n) => {
      if (sensorFilter && (n.sensorType ?? "").toUpperCase() !== sensorFilter) {
        return false;
      }
      if (statusFilter && (n.status ?? "").toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name, "es");
      }
      if (sortBy === "name-desc") {
        return b.name.localeCompare(a.name, "es");
      }
      if (sortBy === "sensor-asc") {
        return labelSensorType(a.sensorType).localeCompare(labelSensorType(b.sensorType), "es");
      }
      if (sortBy === "last-seen-desc") {
        return String(b.lastSeen ?? "").localeCompare(String(a.lastSeen ?? ""));
      }
      if (sortBy === "last-seen-asc") {
        return String(a.lastSeen ?? "").localeCompare(String(b.lastSeen ?? ""));
      }
      return 0;
    });

  const statusOptions = Array.from(
    new Set(nodes.map((n) => (n.status ?? "").toUpperCase()).filter(Boolean))
  ).sort();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader eyebrow="Monitoreo" title="Monitoreo de nodos" />

      <div className="flex flex-wrap items-center justify-between gap-3">
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

      <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-surface-elevated/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Tipo de sensor</label>
          <select
            value={sensorFilter}
            onChange={(e) => {
              setSensorFilter(e.target.value as SensorTypeCode | "");
              setPage(0);
            }}
            className="mt-1.5 w-full rounded-lg border border-white/15 bg-app px-2 py-2 text-xs text-slate-200"
          >
            <option value="">Todos</option>
            {SENSOR_TYPES.map((t) => (
              <option key={t} value={t}>
                {labelSensorType(t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="mt-1.5 w-full rounded-lg border border-white/15 bg-app px-2 py-2 text-xs text-slate-200"
          >
            <option value="">Todos</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Ordenar</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="mt-1.5 w-full rounded-lg border border-white/15 bg-app px-2 py-2 text-xs text-slate-200"
          >
            <option value="name-asc">Nombre A → Z</option>
            <option value="name-desc">Nombre Z → A</option>
            <option value="sensor-asc">Tipo de sensor</option>
            <option value="last-seen-desc">Última señal: reciente primero</option>
            <option value="last-seen-asc">Última señal: antigua primero</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {displayedNodes.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => openDetail(n.id)}
            className="rounded-xl border border-white/10 bg-surface-elevated/50 p-4 text-left transition-colors hover:border-accent/40 hover:bg-surface-elevated/80"
          >
            <p className="font-semibold text-slate-100">{n.name}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {n.externalId ?? (n.sensorType ? labelSensorType(n.sensorType) : "Sin referencia externa")}
            </p>
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

      {displayedNodes.length === 0 && !error ? (
        <p className="mt-8 text-center text-sm text-slate-500">
          {nodes.length === 0
            ? "No hay nodos registrados para tu tranque."
            : "Ningún nodo coincide con los filtros en esta página."}
        </p>
      ) : null}

      {totalElements > 0 ? (
        <Pagination
          className="mt-6 rounded-xl border border-white/10 bg-surface-elevated/40"
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(0);
          }}
        />
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
