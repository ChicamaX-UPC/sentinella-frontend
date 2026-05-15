"use client";

import { useEffect, useState } from "react";
import { AlertRuleDetailModal } from "@/components/alerts/AlertRuleDetailModal";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError, apiFetch, apiJson } from "@/lib/api/http";
import {
  ALERT_SEVERITIES,
  NOTIFY_CHANNELS,
  OPERATORS_NUMERIC,
  SENSOR_TYPES,
  labelAlertSeverity,
  labelNotifyChannel,
  labelNumericOperator,
  labelSensorType,
  type AlertSeverityCode,
  type NotifyChannel,
  type NumericOperator,
  type SensorTypeCode,
} from "@/lib/ui/labels";

type Rule = {
  id: string;
  nodeId: string;
  sensorType: string;
  operator: string;
  thresholdValue: string | number;
  severity: string;
  channels: string[];
  escalationMinutes?: number | null;
  active?: boolean;
};

export default function AlertRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailRule, setDetailRule] = useState<Rule | null>(null);
  const [form, setForm] = useState({
    nodeId: "",
    sensorType: "WATER_LEVEL" as SensorTypeCode,
    operator: "GT" as NumericOperator,
    thresholdValue: "0",
    severity: "WARNING" as AlertSeverityCode,
    channels: ["APP"] as NotifyChannel[],
    escalationMinutes: "",
  });

  function load() {
    setError(null);
    apiJson<Rule[]>("alert-rules")
      .then(setRules)
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "No se pudieron cargar las reglas");
      });
  }

  useEffect(() => {
    load();
  }, []);

  function toggleChannel(ch: NotifyChannel) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch],
    }));
  }

  function resetForm() {
    setForm({
      nodeId: "",
      sensorType: "WATER_LEVEL",
      operator: "GT",
      thresholdValue: "0",
      severity: "WARNING",
      channels: ["APP"],
      escalationMinutes: "",
    });
  }

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (form.channels.length === 0) {
        setError("Selecciona al menos un canal de notificación");
        setBusy(false);
        return;
      }
      await apiJson<Rule>("alert-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: form.nodeId.trim(),
          sensorType: form.sensorType,
          operator: form.operator,
          thresholdValue: Number(form.thresholdValue),
          severity: form.severity,
          channels: form.channels,
          escalationMinutes: form.escalationMinutes ? Number(form.escalationMinutes) : null,
        }),
      });
      resetForm();
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.body ?? `Error ${err.status}` : "No se pudo crear la regla");
    } finally {
      setBusy(false);
    }
  }

  async function removeRule(id: string) {
    if (!confirm("¿Eliminar esta regla de umbral?")) {
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch(`alert-rules/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const t = await res.text();
        throw new ApiError(`HTTP ${res.status}`, res.status, t);
      }
      load();
      setDetailRule((d) => (d?.id === id ? null : d));
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.body ?? `Error ${err.status}` : "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Umbrales y reglas"
        description="Define cuándo disparar alertas por sensor y umbral. Los cambios aplican según tu rol en el sistema."
      />
      {error ? <p className="mb-4 text-sm text-amber-400">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover"
        >
          Nueva regla
        </button>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          if (!busy) {
            setModalOpen(false);
          }
        }}
        title="Nueva regla de umbral"
      >
        <form onSubmit={(ev) => void createRule(ev)} className="space-y-3 text-sm">
          <div>
            <label className="text-xs text-slate-500">Nodo (identificador)</label>
            <input
              required
              value={form.nodeId}
              onChange={(e) => setForm((f) => ({ ...f, nodeId: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
              placeholder="UUID del nodo"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Tipo de sensor</label>
            <select
              value={form.sensorType}
              onChange={(e) => setForm((f) => ({ ...f, sensorType: e.target.value as SensorTypeCode }))}
              className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
            >
              {SENSOR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {labelSensorType(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500">Condición</label>
              <select
                value={form.operator}
                onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value as NumericOperator }))}
                className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
              >
                {OPERATORS_NUMERIC.map((o) => (
                  <option key={o} value={o}>
                    {labelNumericOperator(o)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Umbral</label>
              <input
                required
                type="number"
                step="any"
                value={form.thresholdValue}
                onChange={(e) => setForm((f) => ({ ...f, thresholdValue: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Severidad de la alerta</label>
            <select
              value={form.severity}
              onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as AlertSeverityCode }))}
              className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
            >
              {ALERT_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {labelAlertSeverity(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-xs text-slate-500">Canales de notificación</span>
            <div className="mt-2 flex flex-wrap gap-3">
              {NOTIFY_CHANNELS.map((ch) => (
                <label key={ch} className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.channels.includes(ch)}
                    onChange={() => toggleChannel(ch)}
                    className="rounded border-white/20 bg-app"
                  />
                  {labelNotifyChannel(ch)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Escalación (minutos, opcional)</label>
            <input
              type="number"
              min={0}
              value={form.escalationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, escalationMinutes: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!busy) {
                  resetForm();
                  setModalOpen(false);
                }
              }}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar regla"}
            </button>
          </div>
        </form>
      </Modal>

      <AlertRuleDetailModal
        rule={detailRule}
        open={detailRule != null}
        onClose={() => setDetailRule(null)}
        deleteBusy={busy}
        onDelete={(id) => void removeRule(id)}
      />

      <h2 className="mt-10 text-sm font-semibold text-slate-200">Reglas configuradas</h2>
      <p className="mt-1 text-xs text-slate-500">Pulsa una regla para ver el detalle completo en ventana emergente.</p>
      <ul className="mt-3 space-y-2 text-sm">
        {rules.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-surface-elevated/50 px-3 py-3"
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => setDetailRule(r)}
              className="min-w-0 flex-1 text-left transition-colors hover:opacity-90 disabled:opacity-50"
            >
              <span className="block text-slate-300">
                <span className="font-medium text-slate-200">{labelSensorType(r.sensorType)}</span>
                {" · "}
                <span className="text-slate-400">{labelNumericOperator(r.operator)}</span> {String(r.thresholdValue)} →{" "}
                <span className="text-accent/90">{labelAlertSeverity(r.severity)}</span>
                <span className="text-slate-500"> — nodo {r.nodeId.slice(0, 8)}…</span>
              </span>
              <span className="mt-1 block text-xs text-accent/70">Ver detalle →</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void removeRule(r.id)}
              className="shrink-0 text-xs text-red-400 hover:underline disabled:opacity-50"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
      {rules.length === 0 ? <p className="mt-4 text-center text-sm text-slate-500">No hay reglas todavía.</p> : null}
    </div>
  );
}
