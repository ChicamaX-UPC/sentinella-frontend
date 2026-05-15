"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, apiJson } from "@/lib/api/http";
import { enqueueMutation } from "@/lib/mobile/outbox";
import { loadRoundSnapshot, saveRoundSnapshot } from "@/lib/mobile/offlineCache";

type ChecklistItem = {
  id: string;
  pointName: string;
  completedAt?: string | null;
};

type Round = {
  id: string;
  status: string;
  checklistItems: ChecklistItem[];
};

export default function MobileRoundPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [round, setRound] = useState<Round | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  function applyJson(json: string) {
    setRound(JSON.parse(json) as Round);
  }

  function load() {
    if (!id) {
      return;
    }
    setError(null);
    setFromCache(false);
    apiJson<Round>(`rounds/${id}`)
      .then((r) => {
        setRound(r);
        void saveRoundSnapshot(id, JSON.stringify(r));
      })
      .catch(async (e: unknown) => {
        const snap = await loadRoundSnapshot(id);
        if (snap) {
          try {
            applyJson(snap);
            setFromCache(true);
            setError(null);
          } catch {
            setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
          }
        } else {
          setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
        }
      });
  }

  useEffect(() => {
    load();
  }, [id]);

  async function sync() {
    if (!id) {
      return;
    }
    try {
      if (!navigator.onLine) {
        await enqueueMutation({
          method: "POST",
          path: `rounds/${id}/sync`,
          body: JSON.stringify({}),
          createdAt: Date.now(),
        });
        return;
      }
      const updated = await apiJson<Round>(`rounds/${id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setRound(updated);
      void saveRoundSnapshot(id, JSON.stringify(updated));
    } catch {
      await enqueueMutation({
        method: "POST",
        path: `rounds/${id}/sync`,
        body: JSON.stringify({}),
        createdAt: Date.now(),
      });
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <h1 className="text-xl font-bold text-slate-50">Ronda</h1>
      {fromCache ? <p className="text-xs text-amber-400">Checklist desde IndexedDB (última copia)</p> : null}
      {error ? <p className="text-amber-400">{error}</p> : null}
      {round ? (
        <>
          <p className="text-slate-400">Estado: {round.status}</p>
          <button
            type="button"
            onClick={() => void sync()}
            className="min-h-11 rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-200"
          >
            Sincronizar
          </button>
          <ul className="space-y-2">
            {(round.checklistItems ?? []).map((it) => (
              <li key={it.id} className="rounded-xl border-2 border-slate-800 bg-slate-900/50 px-3 py-3">
                <p className="font-medium text-slate-200">{it.pointName}</p>
                {it.completedAt ? (
                  <p className="text-xs text-emerald-400">Listo</p>
                ) : (
                  <Link
                    href={`/mobile/round/${id}/item/${it.id}`}
                    className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-accent underline"
                  >
                    Completar ítem
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <Link href="/mobile" className="block text-center text-xs text-accent underline">
        Inicio
      </Link>
    </div>
  );
}
