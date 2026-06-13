"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { labelAssignableUser, useAssignableUsers } from "@/hooks/useAssignableUsers";
import { useNodeLabelById } from "@/hooks/useNodeLabelById";
import { ApiError, apiJson } from "@/lib/api/http";
import {
  labelAlertSeverity,
  labelAlertStatus,
  labelAuditAction,
  labelRole,
  labelSensorType,
} from "@/lib/ui/labels";

export type AlertDetail = {
  id: string;
  ruleId?: string;
  nodeId: string;
  sensorType?: string;
  triggeredValue?: string | number;
  severity?: string;
  status?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  assignedTo?: string;
  closedBy?: string;
  closedAt?: string;
  resolutionNotes?: string | null;
};

type AuditRow = {
  id: string;
  action: string;
  actorId?: string;
  actorRole?: string;
  notes?: string | null;
  timestamp: string;
};

type Props = {
  alertId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

function severityBadge(s?: string): string {
  const u = (s ?? "").toUpperCase();
  if (u.includes("CRITICAL") || u.includes("CRIT")) return "bg-red-950/50 text-red-200 ring-1 ring-red-800/50";
  if (u.includes("WARN")) return "bg-amber-950/40 text-amber-100 ring-1 ring-amber-800/40";
  if (u.includes("INFO")) return "bg-accent-blue/15 text-accent-blue ring-1 ring-accent-blue/30";
  return "bg-slate-800/80 text-slate-300 ring-1 ring-white/10";
}

export function AlertDetailModal({ alertId, open, onClose, onUpdated }: Props) {
  const { users: assignableUsers, loading: usersLoading } = useAssignableUsers(open);
  const { getNodeLabel } = useNodeLabelById(open);
  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [notes, setNotes] = useState("");

  const reload = useCallback(() => {
    if (!alertId) {
      return;
    }
    setError(null);
    Promise.all([
      apiJson<AlertDetail>(`alerts/${alertId}`),
      apiJson<AuditRow[]>(`alerts/${alertId}/audit`),
    ])
      .then(([a, au]) => {
        setAlert(a);
        setAudit(Array.isArray(au) ? au : []);
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
      });
  }, [alertId]);

  useEffect(() => {
    if (!open || !alertId) {
      setAlert(null);
      setAudit([]);
      setError(null);
      setAssignTo("");
      setNotes("");
      return;
    }
    reload();
  }, [open, alertId, reload]);

  async function patch(action: "ACKNOWLEDGE" | "COMPLETE" | "CLOSE") {
    if (!alertId) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { action, notes: notes || undefined };
      if (action === "COMPLETE") {
        if (!assignTo.trim()) {
          setError("Seleccione un responsable");
          setBusy(false);
          return;
        }
        body.assignedTo = assignTo.trim();
      }
      const updated = await apiJson<AlertDetail>(`alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setAlert(updated);
      setNotes("");
      const au = await apiJson<AuditRow[]>(`alerts/${alertId}/audit`);
      setAudit(Array.isArray(au) ? au : []);
      onUpdated?.();
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.body ?? `Error ${e.status}` : "Error al actualizar");
    } finally {
      setBusy(false);
    }
  }

  const title = alert
    ? `${labelSensorType(alert.sensorType)} — ${labelAlertSeverity(alert.severity)}`
    : alertId
      ? `Alerta ${alertId.slice(0, 8)}…`
      : "Detalle de alerta";

  return (
    <Modal open={open} onClose={onClose} title={title} panelClassName="max-w-2xl">
      {error ? <p className="mb-3 text-sm text-amber-400">{error}</p> : null}
      {!alert && !error && open ? <p className="text-sm text-slate-500">Cargando…</p> : null}
      {alert ? (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${severityBadge(alert.severity)}`}>
              {labelAlertSeverity(alert.severity)}
            </span>
            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
              {labelAlertStatus(alert.status)}
            </span>
          </div>

          <dl className="grid gap-3 rounded-lg border border-white/10 bg-app/50 p-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Nodo</dt>
              <dd className="mt-0.5 text-slate-200">{getNodeLabel(alert.nodeId)}</dd>
              <dd className="mt-0.5 break-all font-mono text-[11px] text-slate-500" title={alert.nodeId}>
                {alert.nodeId}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Sensor</dt>
              <dd className="mt-0.5 text-slate-200">{labelSensorType(alert.sensorType)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Valor disparado</dt>
              <dd className="mt-0.5 font-mono text-accent">{String(alert.triggeredValue ?? "—")}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Regla</dt>
              <dd className="mt-0.5 font-mono text-slate-400">{alert.ruleId?.slice(0, 8) ?? "—"}…</dd>
            </div>
            {alert.assignedTo ? (
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Asignada a</dt>
                <dd className="mt-0.5 text-slate-300">
                  {assignableUsers.find((u) => u.id === alert.assignedTo)
                    ? labelAssignableUser(assignableUsers.find((u) => u.id === alert.assignedTo)!)
                    : alert.assignedTo}
                </dd>
              </div>
            ) : null}
            {alert.resolutionNotes ? (
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Notas de resolución</dt>
                <dd className="mt-0.5 text-slate-300">{alert.resolutionNotes}</dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void patch("ACKNOWLEDGE")}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-50"
            >
              Reconocer
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void patch("CLOSE")}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-[#1a0f08] hover:bg-accent-hover disabled:opacity-50"
            >
              Cerrar alerta
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1">
              <label className="text-[11px] text-slate-500">Asignar a</label>
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                disabled={usersLoading || busy}
                className="mt-1 w-full rounded-lg border border-white/15 bg-app px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-accent/40"
              >
                <option value="">Seleccionar usuario…</option>
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {labelAssignableUser(u)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void patch("COMPLETE")}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
            >
              Asignar
            </button>
          </div>

          <div>
            <label className="text-[11px] text-slate-500">Notas de la acción</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-white/15 bg-app px-2 py-1.5 text-xs text-slate-100"
            />
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Historial</h3>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-400">
              {audit.length === 0 ? <li className="text-slate-600">Sin entradas de auditoría.</li> : null}
              {audit.map((row) => (
                <li key={row.id} className="border-b border-white/5 py-1.5">
                  <span className="text-slate-500">{row.timestamp}</span> — {labelAuditAction(row.action)}{" "}
                  <span className="text-slate-600">({labelRole(row.actorRole)})</span>
                  {row.notes ? <span className="text-slate-500"> — {row.notes}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
