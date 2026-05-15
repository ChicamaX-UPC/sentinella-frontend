"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { InspectionRoundModal } from "@/components/inspections/InspectionRoundModal";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError, apiJson } from "@/lib/api/http";
import { labelRoundStatus } from "@/lib/ui/labels";
import { useSessionStore } from "@/stores/useSessionStore";

type Round = {
  id: string;
  operatorId?: string;
  tailingDamId: string;
  scheduledAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  status: string;
  offlineCreated?: boolean;
};

export default function InspectionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando inspecciones…</div>}>
      <InspectionsPageContent />
    </Suspense>
  );
}

function InspectionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSessionStore((s) => s.user);

  const [rounds, setRounds] = useState<Round[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tailingDamId, setTailingDamId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const detailId = searchParams.get("ronda");
  const newModalOpen = searchParams.get("nuevaRonda") === "1";

  const load = useCallback(() => {
    setError(null);
    apiJson<Round[]>("rounds")
      .then(setRounds)
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar rondas");
      });
  }, []);

  useEffect(() => {
    useSessionStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (user?.tailingDamIds?.length && !tailingDamId) {
      setTailingDamId(user.tailingDamIds[0]);
    }
  }, [user, tailingDamId]);

  useEffect(() => {
    load();
  }, [load]);

  function replaceQuery(next: string) {
    router.replace(next || "/inspections", { scroll: false });
  }

  async function createRound(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const iso = new Date(scheduledAt).toISOString();
      await apiJson<Round>("rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tailingDamId: tailingDamId.trim(),
          scheduledAt: iso,
          offlineCreated: false,
        }),
      });
      setScheduledAt("");
      load();
      replaceQuery("/inspections");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.body ?? `Error ${err.status}` : "Error al crear");
    } finally {
      setBusy(false);
    }
  }

  function openRound(id: string) {
    router.replace(`/inspections?ronda=${encodeURIComponent(id)}`, { scroll: false });
  }

  function closeDetail() {
    replaceQuery("/inspections");
  }

  function openNewModal() {
    router.replace("/inspections?nuevaRonda=1", { scroll: false });
  }

  function closeNewModal() {
    replaceQuery("/inspections");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Rondas de inspección"
          description="Programa y sigue las rondas de campo por tranque. Abre una tarjeta para el checklist."
        />
        <button
          type="button"
          onClick={() => openNewModal()}
          className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover"
        >
          Nueva ronda
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-amber-400">{error}</p> : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rounds.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => openRound(r.id)}
            className="rounded-xl border border-white/10 bg-surface-elevated/50 p-4 text-left transition-colors hover:border-accent/35 hover:bg-surface-elevated/80"
          >
            <p className="text-xs font-mono text-slate-500">{r.id.slice(0, 8)}…</p>
            <p className="mt-2 text-sm font-medium text-slate-100">{labelRoundStatus(r.status)}</p>
            <p className="mt-1 text-xs text-slate-500">Programada: {r.scheduledAt}</p>
            <p className="mt-4 text-xs text-accent/80">Abrir checklist →</p>
          </button>
        ))}
      </div>

      {rounds.length === 0 && !error ? (
        <p className="mt-10 text-center text-sm text-slate-500">No hay rondas todavía.</p>
      ) : null}

      <Modal open={newModalOpen} onClose={closeNewModal} title="Nueva ronda de inspección" panelClassName="max-w-md">
        <form onSubmit={(ev) => void createRound(ev)} className="space-y-3 text-sm">
          <div>
            <label className="text-xs text-slate-500">Tranque (UUID)</label>
            <input
              required
              value={tailingDamId}
              onChange={(e) => setTailingDamId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Fecha y hora programada</label>
            <input
              required
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? "Creando…" : "Programar ronda"}
          </button>
        </form>
      </Modal>

      <InspectionRoundModal
        roundId={detailId}
        open={Boolean(detailId)}
        onClose={closeDetail}
        onUpdated={() => {
          load();
        }}
      />
    </div>
  );
}
