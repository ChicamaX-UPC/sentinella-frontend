"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError, apiJson } from "@/lib/api/http";
import { playFieldAlertChime, pulseFieldAlertVibration } from "@/lib/mobile/alertTone";
import { loadAlertsCache, saveAlertsCache } from "@/lib/mobile/offlineCache";

type AlertRow = { id: string; status: string; severity?: string; nodeId?: string };

export default function MobileAlertsPage() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setError(null);
    setFromCache(false);
    apiJson<AlertRow[]>("alerts")
      .then((list) => {
        setRows(list);
        void saveAlertsCache(JSON.stringify(list));
      })
      .catch(async () => {
        const raw = await loadAlertsCache();
        if (raw) {
          try {
            setRows(JSON.parse(raw) as AlertRow[]);
            setFromCache(true);
          } catch {
            setError("Sin datos (offline sin caché previa)");
          }
        } else {
          setError("Sin datos (offline sin caché previa)");
        }
      });
  }, []);

  useEffect(() => {
    if (rows.length === 0) {
      return;
    }
    const now = new Set(rows.map((r) => r.id));
    const hadPrev = prevIdsRef.current.size > 0;
    const hasNew = [...now].some((id) => !prevIdsRef.current.has(id));
    if (hadPrev && hasNew) {
      playFieldAlertChime();
      pulseFieldAlertVibration();
    }
    prevIdsRef.current = now;
  }, [rows]);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-slate-50">Alertas</h1>
      {fromCache ? <p className="text-xs text-amber-400">Mostrando última lista en caché (IndexedDB)</p> : null}
      {error ? <p className="text-sm text-amber-400">{error}</p> : null}
      <ul className="space-y-3">
        {rows.map((a) => (
          <li key={a.id} className="rounded-2xl border-2 border-slate-800 bg-slate-900/50 px-4 py-4">
            <p className="text-lg font-semibold text-accent">{a.severity ?? "ALERTA"}</p>
            <p className="text-sm text-slate-500">{a.status}</p>
            <Link
              href={`/mobile/alerts/${a.id}`}
              className="mt-3 inline-flex min-h-11 min-w-[10rem] items-center justify-center rounded-xl bg-accent/90 px-4 text-sm font-medium text-white"
            >
              Abrir alerta
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 && !error ? <p className="text-sm text-slate-500">Sin alertas.</p> : null}
    </div>
  );
}
