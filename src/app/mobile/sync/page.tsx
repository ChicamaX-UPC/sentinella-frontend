"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { countPendingOutbox, flushMutationOutbox } from "@/lib/mobile/outbox";
import { countPhotoDrafts } from "@/lib/mobile/pendingCounts";

export default function MobileSyncPage() {
  const [outbox, setOutbox] = useState(0);
  const [photos, setPhotos] = useState(0);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [o, p] = await Promise.all([countPendingOutbox(), countPhotoDrafts()]);
    setOutbox(o);
    setPhotos(p);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function flush() {
    setBusy(true);
    try {
      await flushMutationOutbox();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <h1 className="text-xl font-bold text-slate-50">Sincronización</h1>
      <p className="text-slate-400">
        Mutaciones API en cola: <span className="text-accent">{outbox}</span>
      </p>
      <p className="text-slate-400">
        Fotos en borrador (IndexedDB): <span className="text-accent">{photos}</span>
      </p>
      <button
        type="button"
        disabled={busy || !navigator.onLine}
        onClick={() => void flush()}
        className="w-full rounded-xl bg-accent py-3 text-base font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Sincronizando…" : "Reintentar cola API"}
      </button>
      <p className="text-xs text-slate-600">
        Tras enviar checklist, las fotos locales se limpian cuando el PATCH se confirma en el servidor.
      </p>
      <Link href="/mobile" className="block text-center text-xs text-accent underline">
        Inicio
      </Link>
    </div>
  );
}
