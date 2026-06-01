"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, apiJson } from "@/lib/api/http";
import { labelAlertSeverity, labelAlertStatus, labelSensorType } from "@/lib/ui/labels";
import { enqueueMutation } from "@/lib/mobile/outbox";
import { useSessionStore } from "@/stores/useSessionStore";

type AlertDetail = {
  id: string;
  nodeId: string;
  sensorType?: string;
  triggeredValue?: string | number;
  severity?: string;
  status?: string;
  resolutionNotes?: string | null;
};

type AuditRow = {
  id: string;
  action: string;
  actorRole?: string;
  notes?: string | null;
  timestamp: string;
};

export default function MobileAlertDetailPage() {
  const params = useParams();
  const alertId = typeof params?.alertId === "string" ? params.alertId : "";
  const user = useSessionStore((s) => s.user);
  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [assignTo, setAssignTo] = useState("");

  useEffect(() => {
    useSessionStore.getState().hydrate();
  }, []);

  function load() {
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
  }

  useEffect(() => {
    load();
  }, [alertId]);

  async function sendPatch(body: Record<string, unknown>) {
    if (!alertId) {
      return;
    }
    const json = JSON.stringify(body);
    const queue = async () => {
      await enqueueMutation({
        method: "PATCH",
        path: `alerts/${alertId}`,
        body: json,
        createdAt: Date.now(),
      });
      setError("Sin red o fallo de red: acción en cola de sincronización");
    };
    if (!navigator.onLine) {
      await queue();
      return;
    }
    try {
      const updated = await apiJson<AlertDetail>(`alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: json,
      });
      setAlert(updated);
      setNotes("");
      setAssignTo("");
      const au = await apiJson<AuditRow[]>(`alerts/${alertId}/audit`);
      setAudit(Array.isArray(au) ? au : []);
      setError(null);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(e.body ?? `Error ${e.status}`);
        return;
      }
      await queue();
    }
  }

  async function acknowledge() {
    setBusy(true);
    setError(null);
    try {
      await sendPatch({ action: "ACKNOWLEDGE", notes: notes.trim() || undefined });
    } finally {
      setBusy(false);
    }
  }

  async function closeAlert() {
    setBusy(true);
    setError(null);
    try {
      await sendPatch({ action: "CLOSE", notes: notes.trim() || undefined });
    } finally {
      setBusy(false);
    }
  }

  async function assignAlert() {
    if (!assignTo.trim()) {
      setError("Indica el identificador de usuario (UUID)");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendPatch({ action: "COMPLETE", assignedTo: assignTo.trim(), notes: notes.trim() || undefined });
    } finally {
      setBusy(false);
    }
  }

  const role = user?.role;
  const operatorOnly = role === "FIELD_OPERATOR";
  const canManage = role === "PLANT_MANAGER" || role === "SYSTEM_ADMIN";

  return (
    <div className="space-y-4 text-sm">
      <Link href="/mobile/alerts" className="text-xs text-accent underline">
        Volver a alertas
      </Link>
      <h1 className="text-xl font-bold text-slate-50">Alerta</h1>
      {error ? <p className="text-amber-400">{error}</p> : null}
      {alert ? (
        <div className="rounded-2xl border-2 border-slate-800 bg-slate-900/50 p-4">
          <p className="text-lg font-semibold text-accent">{labelAlertSeverity(alert.severity)}</p>
          <p className="mt-1 text-slate-300">Estado: {labelAlertStatus(alert.status)}</p>
          <p className="mt-2 text-slate-400">
            {labelSensorType(alert.sensorType)}: {String(alert.triggeredValue ?? "—")}
          </p>
          <p className="mt-1 text-xs text-slate-600">Nodo: {alert.nodeId}</p>

          <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
            <label className="block text-xs text-slate-500">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void acknowledge()}
              className="min-h-12 w-full rounded-xl bg-accent py-3 text-base font-semibold text-white disabled:opacity-50"
            >
              Reconocer alerta
            </button>
            {canManage ? (
              <div className="space-y-2">
                <input
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                  placeholder="UUID usuario (asignar)"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void assignAlert()}
                  className="min-h-11 w-full rounded-xl bg-slate-800 py-2 text-sm text-slate-100"
                >
                  Asignar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void closeAlert()}
                  className="min-h-11 w-full rounded-xl bg-red-900/60 py-2 text-sm text-red-100"
                >
                  Cerrar alerta
                </button>
              </div>
            ) : null}
            {operatorOnly ? (
              <p className="text-xs text-slate-600">Operario: solo confirmación (ACK) vía API.</p>
            ) : null}
            {!operatorOnly && !canManage ? (
              <p className="text-xs text-slate-500">
                Vista extendida:{" "}
                <Link href={`/alerts/${alertId}`} className="text-accent underline">
                  escritorio
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div>
        <h2 className="text-sm font-semibold text-slate-300">Auditoría</h2>
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-slate-500">
          {audit.map((row) => (
            <li key={row.id}>
              {row.timestamp} — {row.action} ({row.actorRole ?? "?"})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
