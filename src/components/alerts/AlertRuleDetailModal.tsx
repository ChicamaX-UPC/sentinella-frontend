"use client";

import { Modal } from "@/components/ui/Modal";
import {
  formatThresholdCondition,
  labelAlertSeverity,
  labelNotifyChannel,
  labelSensorType,
} from "@/lib/ui/labels";

export type AlertRuleDetail = {
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

type Props = {
  rule: AlertRuleDetail | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  deleteBusy?: boolean;
  nodeLabel?: string;
};

export function AlertRuleDetailModal({ rule, open, onClose, onDelete, deleteBusy, nodeLabel }: Props) {
  if (!open || !rule) {
    return null;
  }

  return (
    <Modal open onClose={onClose} title="Detalle de la regla" panelClassName="max-w-lg">
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Identificador</dt>
          <dd className="mt-1 break-all font-mono text-xs text-slate-300">{rule.id}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nodo</dt>
          <dd className="mt-1 text-slate-200">{nodeLabel ?? rule.nodeId}</dd>
          {nodeLabel ? (
            <dd className="mt-0.5 break-all font-mono text-[11px] text-slate-500">{rule.nodeId}</dd>
          ) : null}
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tipo de sensor</dt>
          <dd className="mt-1 text-slate-200">{labelSensorType(rule.sensorType)}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Condición de umbral</dt>
            <dd className="mt-1 text-slate-200">
              {formatThresholdCondition(rule.operator, rule.thresholdValue, rule.sensorType)}
            </dd>
          </div>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Severidad</dt>
          <dd className="mt-1 text-accent/90">{labelAlertSeverity(rule.severity)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Canales</dt>
          <dd className="mt-1 text-slate-200">
            {rule.channels?.length
              ? rule.channels.map((c) => labelNotifyChannel(c)).join(" · ")
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Escalación (min)</dt>
          <dd className="mt-1 text-slate-200">
            {rule.escalationMinutes != null ? String(rule.escalationMinutes) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estado</dt>
          <dd className="mt-1 text-slate-200">{rule.active === false ? "Inactiva" : "Activa"}</dd>
        </div>
      </dl>
      {onDelete ? (
        <div className="mt-6 border-t border-white/10 pt-4">
          <button
            type="button"
            disabled={deleteBusy}
            onClick={() => onDelete(rule.id)}
            className="w-full rounded-lg border border-red-900/40 py-2.5 text-sm text-red-400 hover:bg-red-950/30 disabled:opacity-50"
          >
            Eliminar esta regla
          </button>
        </div>
      ) : null}
    </Modal>
  );
}
