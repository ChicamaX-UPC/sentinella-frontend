"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EditSimulationModal, NewSimulationModal } from "@/components/simulations/SimulationModals";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError, apiFetch, apiJson } from "@/lib/api/http";
import { labelSimulationType } from "@/lib/ui/labels";

type Scenario = {
  id: string;
  name: string;
  description?: string | null;
  simulationType: string;
  tailingDamId: string;
  isPublic?: boolean;
  public?: boolean;
  createdAt?: string;
};

function scenarioIsPublic(s: Scenario): boolean {
  return Boolean(s.isPublic ?? s.public);
}

export function SimulationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [list, setList] = useState<Scenario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const editId = searchParams.get("editar");
  const newOpen = searchParams.get("nuevo") === "1";

  const load = useCallback(() => {
    setError(null);
    apiJson<Scenario[]>("simulation-scenarios")
      .then(setList)
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function goBase() {
    router.replace("/simulations", { scroll: false });
  }

  async function publish(id: string, pub: boolean) {
    setBusy(true);
    try {
      await apiJson(`simulation-scenarios/${id}/${pub ? "publish" : "unpublish"}`, { method: "PATCH" });
      load();
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.body ?? `Error ${e.status}` : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este escenario de simulación?")) {
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch(`simulation-scenarios/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const t = await res.text();
        throw new ApiError(`HTTP ${res.status}`, res.status, t);
      }
      load();
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.body ?? `Error ${e.status}` : "Error al eliminar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader eyebrow="Análisis" title="Escenarios de simulación" />
        <button
          type="button"
          onClick={() => router.replace("/simulations?nuevo=1", { scroll: false })}
          className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover"
        >
          Nuevo escenario
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-amber-400">{error}</p> : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((s) => (
          <div
            key={s.id}
            className="flex flex-col rounded-xl border border-white/10 bg-surface-elevated/50 p-4"
          >
            <p className="font-semibold text-slate-100">{s.name}</p>
            {s.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{s.description}</p> : null}
            <p className="mt-3 text-xs text-slate-400">
              {labelSimulationType(s.simulationType)} — {scenarioIsPublic(s) ? "Visible" : "Privado"}
            </p>
            <button
              type="button"
              onClick={() => router.replace(`/simulations?editar=${encodeURIComponent(s.id)}`, { scroll: false })}
              className="mt-4 w-full rounded-lg border border-white/15 py-2 text-xs font-medium text-slate-200 hover:bg-white/5"
            >
              Ver / editar
            </button>
            {scenarioIsPublic(s) ? (
              <button
                type="button"
                onClick={() => router.push(`/digital-twin?scenario=${encodeURIComponent(s.id)}`)}
                className="mt-2 w-full rounded-lg bg-accent-blue/90 py-2 text-xs font-medium text-white hover:bg-accent-blue"
              >
                Abrir en gemelo
              </button>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {scenarioIsPublic(s) ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void publish(s.id, false)}
                  className="text-xs text-slate-400 hover:underline disabled:opacity-50"
                >
                  Despublicar
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void publish(s.id, true)}
                  className="text-xs text-accent hover:underline disabled:opacity-50"
                >
                  Publicar
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(s.id)}
                className="text-xs text-red-400 hover:underline disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {list.length === 0 && !error ? <p className="mt-10 text-center text-sm text-slate-500">Sin escenarios.</p> : null}

      <NewSimulationModal
        open={newOpen}
        onClose={goBase}
        onCreated={() => {
          load();
        }}
      />

      <EditSimulationModal
        open={Boolean(editId)}
        scenarioId={editId}
        onClose={goBase}
        onSaved={() => {
          load();
        }}
      />
    </div>
  );
}
