"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ApiError, apiJson } from "@/lib/api/http";
import { labelRoundStatus } from "@/lib/ui/labels";

type ChecklistItem = {
  id: string;
  pointName: string;
  required?: boolean;
  observations?: string | null;
  completedAt?: string | null;
  anomaly?: boolean;
};

type Round = {
  id: string;
  tailingDamId: string;
  scheduledAt: string;
  status: string;
  checklistItems: ChecklistItem[];
};

type Props = {
  roundId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

export function InspectionRoundModal({ roundId, open, onClose, onUpdated }: Props) {
  const [round, setRound] = useState<Round | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !roundId) {
      setRound(null);
      setError(null);
      return;
    }
    setError(null);
    apiJson<Round>(`rounds/${roundId}`)
      .then(setRound)
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
      });
  }, [open, roundId]);

  async function completeItem(itemId: string) {
    if (!roundId) {
      return;
    }
    setBusy(true);
    try {
      const updated = await apiJson<Round>(`rounds/${roundId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observations: "Completado desde web",
          anomaly: false,
        }),
      });
      setRound(updated);
      onUpdated?.();
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.body ?? `Error ${e.status}` : "Error al completar");
    } finally {
      setBusy(false);
    }
  }

  async function syncRound() {
    if (!roundId) {
      return;
    }
    setBusy(true);
    try {
      const updated = await apiJson<Round>(`rounds/${roundId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setRound(updated);
      onUpdated?.();
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.body ?? `Error ${e.status}` : "Error en sincronización");
    } finally {
      setBusy(false);
    }
  }

  const title = round
    ? `Ronda — ${labelRoundStatus(round.status)}`
    : roundId
      ? `Ronda ${roundId.slice(0, 8)}…`
      : "Detalle de ronda";

  return (
    <Modal open={open} onClose={onClose} title={title} panelClassName="max-w-lg">
      {error ? <p className="mb-3 text-sm text-amber-400">{error}</p> : null}
      {round ? (
        <div className="space-y-4 text-sm">
          <p className="text-xs text-slate-500">
            Programada: <span className="text-slate-300">{round.scheduledAt}</span>
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void syncRound()}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 hover:bg-white/5 disabled:opacity-50"
          >
            Sincronizar con servidor
          </button>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checklist</p>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {(round.checklistItems ?? []).map((it) => (
              <li key={it.id} className="rounded-lg border border-white/10 bg-app/40 px-3 py-2">
                <p className="font-medium text-slate-200">{it.pointName}</p>
                {it.completedAt ? (
                  <p className="text-xs text-emerald-400">Completado: {it.completedAt}</p>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void completeItem(it.id)}
                    className="mt-2 rounded-md bg-accent/90 px-2 py-1 text-xs font-medium text-[#1a0f08] hover:bg-accent-hover disabled:opacity-50"
                  >
                    Marcar completado
                  </button>
                )}
              </li>
            ))}
          </ul>
          {(round.checklistItems ?? []).length === 0 ? (
            <p className="text-xs text-slate-600">Sin ítems en el checklist.</p>
          ) : null}
        </div>
      ) : !error && open && roundId ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : null}
    </Modal>
  );
}
