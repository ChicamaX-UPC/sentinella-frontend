"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, apiJson } from "@/lib/api/http";

type FieldKpi = {
  activeAlerts?: number;
  roundsInProgress?: number;
  pendingSyncRounds?: number;
};

export default function MobileHomePage() {
  const [kpi, setKpi] = useState<FieldKpi | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    apiJson<FieldKpi>("dashboard/field")
      .then(setKpi)
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `No se pudo cargar el turno (${e.status})` : "Error de red");
      });
  }, []);

  const critical = (kpi?.activeAlerts ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-50">Turno de campo</h1>
        <p className="mt-1 text-sm text-slate-500">KPIs desde GET /v1/dashboard/field</p>
      </div>

      {error ? <p className="text-sm text-amber-400">{error}</p> : null}

      {kpi ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border-2 border-slate-800 bg-slate-900/70 px-5 py-6 text-center shadow-inner shadow-black/30">
            <p className="text-4xl font-bold text-accent tabular-nums">{kpi.activeAlerts ?? 0}</p>
            <p className="mt-2 text-sm font-medium uppercase tracking-wide text-slate-400">Alertas activas</p>
          </div>
          <div className="rounded-2xl border-2 border-slate-800 bg-slate-900/70 px-5 py-6 text-center shadow-inner shadow-black/30">
            <p className="text-4xl font-bold text-slate-200 tabular-nums">{kpi.roundsInProgress ?? 0}</p>
            <p className="mt-2 text-sm font-medium uppercase tracking-wide text-slate-400">Rondas en curso</p>
          </div>
          <div className="rounded-2xl border-2 border-slate-800 bg-slate-900/70 px-5 py-6 text-center shadow-inner shadow-black/30">
            <p className="text-4xl font-bold text-amber-300 tabular-nums">{kpi.pendingSyncRounds ?? 0}</p>
            <p className="mt-2 text-sm font-medium uppercase tracking-wide text-slate-400">Sync pendiente</p>
          </div>
        </div>
      ) : !error ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : null}

      {critical ? (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-center text-sm text-red-200">
          Hay alertas activas: revisa el listado y confirma recepción si aplica.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4">
        <Link
          href="/mobile/alerts"
          className="block min-h-[4.5rem] rounded-2xl border-2 border-accent/40 bg-accent/10 px-6 py-5 text-center text-lg font-semibold text-accent active:scale-[0.99]"
        >
          Ver alertas
        </Link>
        <Link
          href="/mobile/round/start"
          className="block min-h-[4.5rem] rounded-2xl border-2 border-slate-700 bg-slate-900/60 px-6 py-5 text-center text-lg font-semibold text-slate-100 active:scale-[0.99]"
        >
          Iniciar ronda
        </Link>
        <Link
          href="/mobile/sync"
          className="block min-h-[4.5rem] rounded-2xl border-2 border-slate-700 bg-slate-900/60 px-6 py-5 text-center text-lg font-semibold text-slate-100 active:scale-[0.99]"
        >
          Sincronización
        </Link>
      </div>
    </div>
  );
}
