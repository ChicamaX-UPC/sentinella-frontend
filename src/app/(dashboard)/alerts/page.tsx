"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AlertDetailModal } from "@/components/alerts/AlertDetailModal";
import { Pagination } from "@/components/ui/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError, apiJson, withQuery } from "@/lib/api/http";
import type { PageResponse } from "@/lib/api/page";
import { severityRank } from "@/lib/alerts/severity";
import {
  SENSOR_TYPES,
  labelAlertSeverity,
  labelAlertStatus,
  labelSensorType,
  type SensorTypeCode,
} from "@/lib/ui/labels";
import { useAlertStore, type AlertBrief } from "@/stores/useAlertStore";

function severityTone(s?: string): string {
  const u = (s ?? "").toUpperCase();
  if (u.includes("CRITICAL") || u.includes("CRIT")) return "bg-red-950/50 text-red-200 ring-1 ring-red-800/50";
  if (u.includes("WARN")) return "bg-amber-950/40 text-amber-100 ring-1 ring-amber-800/40";
  if (u.includes("INFO")) return "bg-accent-blue/15 text-accent-blue ring-1 ring-accent-blue/30";
  return "bg-slate-800/80 text-slate-300 ring-1 ring-white/10";
}

function statusTone(st: string): string {
  const u = st.toUpperCase();
  if (u.includes("RECEIVED") || u.includes("ACTIVE") || u.includes("OPEN")) return "text-red-300";
  if (u.includes("RESOLV") || u.includes("CLOSE")) return "text-slate-400";
  return "text-slate-300";
}

function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando alertas…</div>}>
      <AlertsPageContent />
    </Suspense>
  );
}

function AlertsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailId = searchParams.get("alerta");

  const [rows, setRows] = useState<AlertBrief[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const wsItems = useAlertStore((s) => s.items);
  const [crit, setCrit] = useState(true);
  const [warn, setWarn] = useState(true);
  const [info, setInfo] = useState(true);
  const [other, setOther] = useState(true);
  const [sensorFilter, setSensorFilter] = useState<SensorTypeCode | "">("");
  const [sortBy, setSortBy] = useState<
    "severity-desc" | "severity-asc" | "event-asc" | "event-desc" | "default"
  >("severity-desc");

  const load = () => {
    apiJson<PageResponse<AlertBrief>>(withQuery("alerts", { page, limit: pageSize }))
      .then((res) => {
        setRows(res.content);
        setTotalElements(res.totalElements);
        setTotalPages(res.totalPages);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
      });
  };

  useEffect(() => {
    load();
  }, [page, pageSize]);

  const merged = useMemo(() => {
    return [...wsItems, ...rows].filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);
  }, [rows, wsItems]);

  const filtered = useMemo(() => {
    let list = merged.filter((a) => {
      const s = (a.severity ?? "").toUpperCase();
      if (sensorFilter && (a.sensorType ?? "").toUpperCase() !== sensorFilter) {
        return false;
      }
      if (s.includes("CRITICAL") || s.includes("CRIT")) return crit;
      if (s.includes("WARN")) return warn;
      if (s.includes("INFO")) return info;
      return other;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "severity-desc") {
        return severityRank(b.severity) - severityRank(a.severity);
      }
      if (sortBy === "severity-asc") {
        return severityRank(a.severity) - severityRank(b.severity);
      }
      if (sortBy === "event-asc") {
        return labelSensorType(a.sensorType).localeCompare(labelSensorType(b.sensorType), "es");
      }
      if (sortBy === "event-desc") {
        return labelSensorType(b.sensorType).localeCompare(labelSensorType(a.sensorType), "es");
      }
      return 0;
    });

    return list;
  }, [merged, crit, warn, info, other, sensorFilter, sortBy]);

  function openDetail(id: string) {
    router.replace(`/alerts?alerta=${encodeURIComponent(id)}`, { scroll: false });
  }

  function closeDetail() {
    router.replace("/alerts", { scroll: false });
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem-2rem)] max-w-7xl flex-col gap-4 sm:h-[calc(100dvh-3.5rem-3rem)]">
      <PageHeader
        className="shrink-0"
        eyebrow="Alertas"
        title="Gestión de alertas"
        actions={
          <Link
            href="/alerts/rules"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
          >
            Umbrales y reglas
          </Link>
        }
      />

      {error ? <p className="shrink-0 text-sm text-amber-400">{error}</p> : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <aside className="scrollbar-none shrink-0 rounded-xl border border-white/10 bg-surface-elevated/60 p-4 lg:overflow-y-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Filtrar por severidad</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <input
                id="f-crit"
                type="checkbox"
                checked={crit}
                onChange={(e) => setCrit(e.target.checked)}
                className="rounded border-white/20 bg-app"
              />
              <label htmlFor="f-crit" className="text-red-300">
                Crítica
              </label>
            </li>
            <li className="flex items-center gap-2">
              <input
                id="f-warn"
                type="checkbox"
                checked={warn}
                onChange={(e) => setWarn(e.target.checked)}
                className="rounded border-white/20 bg-app"
              />
              <label htmlFor="f-warn" className="text-amber-200">
                Advertencia
              </label>
            </li>
            <li className="flex items-center gap-2">
              <input
                id="f-info"
                type="checkbox"
                checked={info}
                onChange={(e) => setInfo(e.target.checked)}
                className="rounded border-white/20 bg-app"
              />
              <label htmlFor="f-info" className="text-accent-blue">
                Informativa
              </label>
            </li>
            <li className="flex items-center gap-2">
              <input
                id="f-oth"
                type="checkbox"
                checked={other}
                onChange={(e) => setOther(e.target.checked)}
                className="rounded border-white/20 bg-app"
              />
              <label htmlFor="f-oth" className="text-slate-400">
                Otras
              </label>
            </li>
          </ul>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tipo de evento</p>
            <select
              value={sensorFilter}
              onChange={(e) => setSensorFilter(e.target.value as SensorTypeCode | "")}
              className="mt-2 w-full rounded-lg border border-white/15 bg-app px-2 py-2 text-xs text-slate-200"
            >
              <option value="">Todos</option>
              {SENSOR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {labelSensorType(t)}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ordenar</p>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "severity-desc" | "severity-asc" | "event-asc" | "event-desc" | "default")
              }
              className="mt-2 w-full rounded-lg border border-white/15 bg-app px-2 py-2 text-xs text-slate-200"
            >
              <option value="severity-desc">Severidad: mayor a menor</option>
              <option value="severity-asc">Severidad: menor a mayor</option>
              <option value="event-asc">Evento: A → Z</option>
              <option value="event-desc">Evento: Z → A</option>
              <option value="default">Sin orden adicional</option>
            </select>
          </div>

          <button
            type="button"
            className="mt-4 w-full rounded-lg border border-white/15 py-2 text-xs text-slate-400 hover:bg-white/5"
            onClick={() => {
              setCrit(true);
              setWarn(true);
              setInfo(true);
              setOther(true);
              setSensorFilter("");
              setSortBy("severity-desc");
            }}
          >
            Restablecer filtros
          </button>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-surface-elevated/40">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-xs text-slate-500">
              <span className="font-mono text-slate-300">{filtered.length}</span> filas en pantalla · página{" "}
              <span className="font-mono text-slate-300">{page + 1}</span> de{" "}
              <span className="font-mono text-slate-300">{Math.max(totalPages, 1)}</span>
            </p>
          </div>

          <div className="scrollbar-none min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-surface-elevated/95 backdrop-blur-sm">
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-medium">Evento</th>
                  <th className="px-4 py-3 font-medium">Nodo</th>
                  <th className="px-4 py-3 font-medium">Severidad</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="cursor-pointer border-b border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                    onClick={() => openDetail(a.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-100">{labelSensorType(a.sensorType)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Valor: <span className="font-mono text-slate-300">{String(a.triggeredValue ?? "—")}</span>
                        <span className="mx-1.5 text-slate-600">·</span>
                        <span className="font-mono">{shortId(a.id)}</span>
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{a.nodeId ? shortId(a.nodeId) : "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${severityTone(a.severity)}`}
                      >
                        {labelAlertSeverity(a.severity)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${statusTone(a.status)}`}>{labelAlertStatus(a.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(a.id);
                        }}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-slate-500">No hay alertas con los filtros actuales.</p>
            ) : null}
          </div>

          <Pagination
            className="shrink-0"
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
        </section>
      </div>

      <AlertDetailModal
        alertId={detailId}
        open={Boolean(detailId)}
        onClose={closeDetail}
        onUpdated={load}
      />
    </div>
  );
}
