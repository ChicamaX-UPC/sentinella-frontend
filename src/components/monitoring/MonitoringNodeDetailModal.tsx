"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ApiError, apiJson } from "@/lib/api/http";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !nodeId) {
      setNode(null);
      setStatus(null);
      setReadings([]);
      setError(null);
      return;
    }
    setError(null);
    Promise.all([
      apiJson<SensorNode>(`nodes/${nodeId}`).catch(() => null),
      apiJson<Reading>(`nodes/${nodeId}/status`).catch(() => null),
      apiJson<Reading[]>(`nodes/${nodeId}/readings?limit=30`).catch(() => []),
    ])
      .then(([n, st, r]) => {
        setNode(n);
        setStatus(st);
        setReadings(Array.isArray(r) ? r : []);
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
      });
  }, [open, nodeId]);

  const title = node?.name ?? (nodeId ? `Nodo ${nodeId.slice(0, 8)}…` : "Detalle del nodo");

  return (
    <Modal open={open} onClose={onClose} title={title} panelClassName="max-w-lg">
      {error ? <p className="mb-3 text-sm text-amber-400">{error}</p> : null}
      {node ? (
        <div className="space-y-3 text-sm text-slate-300">
          <div className="grid gap-2 rounded-lg border border-white/10 bg-app/40 px-3 py-2 text-xs">
            <p>
              <span className="text-slate-500">ID:</span> <span className="font-mono">{node.id}</span>
            </p>
            {node.externalId ? (
              <p>
                <span className="text-slate-500">Ref. externa:</span> {node.externalId}
              </p>
            ) : null}
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
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Historial (30)</p>
            <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto text-xs text-slate-400">
              {readings.map((r) => (
                <li key={r.id} className="border-b border-white/5 py-1">
                  {r.timestamp} — {labelSensorType(r.sensorType)}: {String(r.value)} {r.unit ?? ""}
                </li>
              ))}
            </ul>
            {readings.length === 0 ? <p className="text-xs text-slate-600">Sin entradas.</p> : null}
          </div>
        </div>
      ) : !error && open && nodeId ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : null}
    </Modal>
  );
}
