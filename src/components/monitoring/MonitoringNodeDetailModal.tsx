"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { ForecastChart } from "@/components/monitoring/ForecastChart";
import { ApiError, apiJson, withQuery } from "@/lib/api/http";
import { fetchNodeForecast, type NodeForecast } from "@/lib/api/forecast";
import type { PageResponse } from "@/lib/api/page";
import { labelSensorType } from "@/lib/ui/labels";

type SensorNode = {
  id: string;
  name: string;
  externalId?: string;
  sensorType?: string;
  status?: string;
  lastSeen?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

type Reading = {
  id: string;
  nodeId: string;
  timestamp: string;
  sensorType?: string;
  value?: string | number;
  unit?: string;
  status?: string;
};

type Props = {
  nodeId: string | null;
  open: boolean;
  onClose: () => void;
};

export function MonitoringNodeDetailModal({ nodeId, open, onClose }: Props) {
  const [node, setNode] = useState<SensorNode | null>(null);
  const [status, setStatus] = useState<Reading | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [readingsPage, setReadingsPage] = useState(0);
  const [readingsPageSize, setReadingsPageSize] = useState(15);
  const [readingsTotal, setReadingsTotal] = useState(0);
  const [readingsTotalPages, setReadingsTotalPages] = useState(0);
  const [forecast, setForecast] = useState<NodeForecast | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReadings = useCallback(
    (id: string, page: number, limit: number) => {
      return apiJson<PageResponse<Reading>>(
        withQuery(`nodes/${id}/readings`, { page, limit })
      ).then((res) => {
        setReadings(res.content);
        setReadingsTotal(res.totalElements);
        setReadingsTotalPages(res.totalPages);
      });
    },
    []
  );

  useEffect(() => {
    if (!open || !nodeId) {
      setNode(null);
      setStatus(null);
      setReadings([]);
      setReadingsPage(0);
      setReadingsTotal(0);
      setReadingsTotalPages(0);
      setForecast(null);
      setError(null);
      return;
    }
    setError(null);
    Promise.all([
      apiJson<SensorNode>(`nodes/${nodeId}`).catch(() => null),
      apiJson<Reading>(`nodes/${nodeId}/status`).catch(() => null),
      loadReadings(nodeId, readingsPage, readingsPageSize),
      fetchNodeForecast(nodeId, 24).catch(() => null),
    ])
      .then(([n, st, , fc]) => {
        setNode(n);
        setStatus(st);
        setForecast(fc);
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
      });
  }, [open, nodeId, readingsPage, readingsPageSize, loadReadings]);

  const title = node?.name ?? (nodeId ? `Nodo ${nodeId.slice(0, 8)}…` : "Detalle del nodo");

  return (
    <Modal open={open} onClose={onClose} title={title} panelClassName="max-w-[min(100vw-2rem,36rem)]">
      {error ? <p className="mb-3 text-sm text-amber-400">{error}</p> : null}
      {node ? (
        <div className="space-y-3 text-sm text-slate-300">
          <div className="grid gap-2 rounded-lg border border-white/10 bg-app/40 px-3 py-2 text-xs">
            {node.externalId ? (
              <p>
                <span className="text-slate-500">Referencia:</span> {node.externalId}
              </p>
            ) : null}
            <p>
              <span className="text-slate-500">Identificador interno:</span>{" "}
              <span className="font-mono">{node.id}</span>
            </p>
            {node.sensorType ? (
              <p>
                <span className="text-slate-500">Sensor:</span> {labelSensorType(node.sensorType)}
              </p>
            ) : null}
            {node.lastSeen ? (
              <p>
                <span className="text-slate-500">Última señal:</span> {node.lastSeen}
              </p>
            ) : null}
          </div>
          {status ? (
            <div className="rounded-lg border border-white/10 bg-surface-elevated/60 p-3">
              <p className="font-medium text-slate-200">Última lectura</p>
              <p className="mt-1 text-slate-400">
                {labelSensorType(status.sensorType)}: {String(status.value)} {status.unit ?? ""}{" "}
                <span className="text-slate-500">({status.status})</span>
              </p>
              <p className="text-xs text-slate-500">{status.timestamp}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sin lecturas recientes.</p>
          )}
          {forecast ? (
            <div className="rounded-lg border border-violet-900/40 bg-violet-950/20 p-3">
              <p className="font-medium text-slate-200">Proyección 24 h</p>
              {forecast.leadTimeMinutes != null && forecast.estimatedThresholdBreachAt ? (
                <p className="mt-1 text-xs text-violet-200">
                  ETA umbral: ~{Math.round(forecast.leadTimeMinutes / 60)} h (
                  {new Date(forecast.estimatedThresholdBreachAt).toLocaleString()})
                  {forecast.rainAdjusted ? " · ajustado por lluvia" : ""}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Sin cruce de umbral estimado en el horizonte.</p>
              )}
              <div className="mt-3 w-full min-w-0 overflow-x-auto">
                <div className="min-w-[280px]">
                  <ForecastChart
                  points={forecast.points.map((p) => ({
                    timestamp: p.timestamp,
                    value: typeof p.value === "number" ? p.value : parseFloat(String(p.value)),
                    projected: p.projected,
                  }))}
                  threshold={
                    forecast.thresholdValue != null
                      ? typeof forecast.thresholdValue === "number"
                        ? forecast.thresholdValue
                        : parseFloat(String(forecast.thresholdValue))
                      : null
                  }
                />
                </div>
              </div>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Historial de lecturas</p>
            <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto text-xs text-slate-400">
              {readings.map((r) => (
                <li key={r.id} className="border-b border-white/5 py-1">
                  {r.timestamp} — {labelSensorType(r.sensorType)}: {String(r.value)} {r.unit ?? ""}
                </li>
              ))}
            </ul>
            {readings.length === 0 ? <p className="text-xs text-slate-600">Sin entradas.</p> : null}
            {readingsTotal > 0 ? (
              <Pagination
                className="mt-2 rounded-lg border border-white/10"
                page={readingsPage}
                totalPages={readingsTotalPages}
                totalElements={readingsTotal}
                pageSize={readingsPageSize}
                pageSizeOptions={[10, 15, 30]}
                onPageChange={setReadingsPage}
                onPageSizeChange={(size) => {
                  setReadingsPageSize(size);
                  setReadingsPage(0);
                }}
              />
            ) : null}
          </div>
        </div>
      ) : !error && open && nodeId ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : null}
    </Modal>
  );
}
