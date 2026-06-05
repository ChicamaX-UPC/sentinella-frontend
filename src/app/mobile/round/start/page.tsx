"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, apiJson } from "@/lib/api/http";
import { enqueueMutation } from "@/lib/mobile/outbox";
import { useSessionStore } from "@/stores/useSessionStore";

export default function MobileRoundStartPage() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const [tailingDamId, setTailingDamId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    useSessionStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (user?.tailingDamIds?.length && !tailingDamId) {
      setTailingDamId(user.tailingDamIds[0]);
    }
  }, [user, tailingDamId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const iso = new Date(scheduledAt).toISOString();
    const body = JSON.stringify({
      tailingDamId: tailingDamId.trim(),
      scheduledAt: iso,
      offlineCreated: !navigator.onLine,
    });
    try {
      if (!navigator.onLine) {
        await enqueueMutation({
          method: "POST",
          path: "rounds",
          body,
          createdAt: Date.now(),
        });
        router.push("/mobile/sync");
        return;
      }
      const created = await apiJson<{ id: string }>("rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      router.push(`/mobile/round/${created.id}`);
    } catch (err: unknown) {
      if (!navigator.onLine || (err instanceof TypeError && String(err.message).includes("fetch"))) {
        await enqueueMutation({
          method: "POST",
          path: "rounds",
          body,
          createdAt: Date.now(),
        });
        router.push("/mobile/sync");
        return;
      }
      setError(err instanceof ApiError ? err.body ?? `Error ${err.status}` : "Error al crear");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <h1 className="text-lg font-semibold text-slate-100">Iniciar ronda</h1>
      <p className="text-slate-500">POST /v1/rounds. Sin red, se encola en Dexie.</p>
      {error ? <p className="text-amber-400">{error}</p> : null}
      <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-3 rounded-lg border border-slate-800 p-4">
        <div>
          <label className="text-xs text-slate-500">Tranque (UUID)</label>
          <input
            required
            value={tailingDamId}
            onChange={(e) => setTailingDamId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Programada</label>
          <input
            required
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-accent py-2 text-white disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Crear ronda"}
        </button>
      </form>
      <Link href="/mobile" className="block text-center text-xs text-accent underline">
        Inicio
      </Link>
    </div>
  );
}
