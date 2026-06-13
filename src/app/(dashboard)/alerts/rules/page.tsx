"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertRuleDetailModal } from "@/components/alerts/AlertRuleDetailModal";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatNodeOptionLabel, useSensorNodeOptions } from "@/hooks/useSensorNodeOptions";
import { useNodeLabelById } from "@/hooks/useNodeLabelById";
import { ApiError, apiFetch, apiJson, withQuery } from "@/lib/api/http";
import type { PageResponse } from "@/lib/api/page";
import {
  ALERT_SEVERITIES,
  NOTIFY_CHANNELS,
  OPERATORS_NUMERIC,
  SENSOR_TYPES,
  labelAlertSeverity,
  labelNotifyChannel,
  labelNumericOperator,
  labelSensorType,
  formatThresholdCondition,
  sensorTypeUnit,
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

const field =
  "mt-1.5 w-full rounded-xl border border-white/12 bg-black/20 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-accent/45 focus:ring-1 focus:ring-accent/20";

export default function AlertRulesPage() {
  const { nodes: nodeOptions, loading: nodesLoading } = useSensorNodeOptions(true);
  const { nodeLabelById } = useNodeLabelById(true);

  const [rules, setRules] = useState<Rule[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
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

  const load = useCallback(() => {
    setError(null);
    apiJson<PageResponse<Rule>>(withQuery("alert-rules", { page, limit: pageSize }))
      .then((res) => {
        setRules(res.content);
        setTotalElements(res.totalElements);
        setTotalPages(res.totalPages);
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "No se pudieron cargar las reglas");
      });
  }, [page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

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
      if (!form.nodeId) {
        setError("Seleccione un nodo");
        setBusy(false);
        return;
      }
      if (form.channels.length === 0) {
        setError("Seleccione al menos un canal de notificación");
        setBusy(false);
        return;
      }
      await apiJson<Rule>("alert-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: form.nodeId,
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
      setPage(0);
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
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader eyebrow="Alertas" title="Umbrales y reglas" />
        <button
          type="button"
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
          className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover"
        >
          Nueva regla
        </button>
      </div>

      {error ? <p className="mb-4 text-sm text-amber-400">{error}</p> : null}

      <section className="rounded-2xl border border-white/10 bg-surface-elevated/40">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-sm font-semibold text-slate-200">Reglas configuradas</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {totalElements} regla{totalElements === 1 ? "" : "s"} · página {page + 1} de {Math.max(totalPages, 1)}
          </p>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">Nodo</th>
                <th className="px-4 py-3 font-medium">Sensor</th>
                <th className="px-4 py-3 font-medium">Condición</th>
                <th className="px-4 py-3 font-medium">Severidad</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-white/5 bg-white/[0.02]">
                  <td className="max-w-[14rem] px-4 py-3">
                    <p className="truncate text-slate-200" title={nodeLabelById.get(r.nodeId) ?? r.nodeId}>
                      {nodeLabelById.get(r.nodeId) ?? r.nodeId.slice(0, 8) + "…"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{labelSensorType(r.sensorType)}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {formatThresholdCondition(r.operator, r.thresholdValue, r.sensorType)}
                  </td>
                  <td className="px-4 py-3 text-accent/90">{labelAlertSeverity(r.severity)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setDetailRule(r)}
                      className="mr-3 text-xs font-medium text-accent hover:underline disabled:opacity-50"
                    >
                      Detalle
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeRule(r.id)}
                      className="text-xs text-red-400 hover:underline disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="space-y-2 p-4 md:hidden">
          {rules.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-medium text-slate-100">{nodeLabelById.get(r.nodeId) ?? r.nodeId}</p>
              <p className="mt-1 text-sm text-slate-400">
                {labelSensorType(r.sensorType)} · {formatThresholdCondition(r.operator, r.thresholdValue, r.sensorType)} →{" "}
                {labelAlertSeverity(r.severity)}
              </p>
              <div className="mt-2 flex gap-3">
                <button type="button" onClick={() => setDetailRule(r)} className="text-xs text-accent">
                  Detalle
                </button>
                <button type="button" onClick={() => void removeRule(r.id)} className="text-xs text-red-400">
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>

        {rules.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-500">No hay reglas todavía.</p>
        ) : null}

        {totalElements > 0 ? (
          <Pagination
            className="border-t border-white/10"
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
      </section>

      <Modal open={modalOpen} onClose={() => !busy && setModalOpen(false)} title="Nueva regla de umbral" panelClassName="max-w-lg">
        <form onSubmit={(ev) => void createRule(ev)} className="space-y-4 text-sm">
          <div>
            <label className="text-xs text-slate-500">Nodo</label>
            <select
              required
              value={form.nodeId}
              disabled={nodesLoading || busy}
              onChange={(e) => setForm((f) => ({ ...f, nodeId: e.target.value }))}
              className={field}
            >
              <option value="">{nodesLoading ? "Cargando nodos…" : "Seleccionar nodo…"}</option>
              {nodeOptions.map((n) => (
                <option key={n.id} value={n.id}>
                  {formatNodeOptionLabel(n)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-slate-500">Tipo de sensor</label>
              <select
                value={form.sensorType}
                onChange={(e) => setForm((f) => ({ ...f, sensorType: e.target.value as SensorTypeCode }))}
                className={field}
              >
                {SENSOR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {labelSensorType(t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Severidad</label>
              <select
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as AlertSeverityCode }))}
                className={field}
              >
                {ALERT_SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {labelAlertSeverity(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-slate-500">Condición</label>
              <select
                value={form.operator}
                onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value as NumericOperator }))}
                className={field}
              >
                {OPERATORS_NUMERIC.map((o) => (
                  <option key={o} value={o}>
                    {labelNumericOperator(o)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">
                Umbral{sensorTypeUnit(form.sensorType) ? ` (${sensorTypeUnit(form.sensorType)})` : ""}
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  required
                  type="number"
                  step="any"
                  value={form.thresholdValue}
                  onChange={(e) => setForm((f) => ({ ...f, thresholdValue: e.target.value }))}
                  className={`${field} flex-1`}
                />
                {sensorTypeUnit(form.sensorType) ? (
                  <span className="shrink-0 text-sm font-medium text-slate-400">{sensorTypeUnit(form.sensorType)}</span>
                ) : null}
              </div>
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-500">Canales</span>
            <div className="mt-2 flex flex-wrap gap-3">
              {NOTIFY_CHANNELS.map((ch) => (
                <label key={ch} className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.channels.includes(ch)}
                    onChange={() => toggleChannel(ch)}
                    className="rounded border-white/20"
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
              className={field}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                resetForm();
                setModalOpen(false);
              }}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#1a0f08] disabled:opacity-50"
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
        nodeLabel={detailRule ? nodeLabelById.get(detailRule.nodeId) : undefined}
      />
    </div>
  );
}
