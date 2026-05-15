"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError, apiJson } from "@/lib/api/http";
import { labelAlertSeverity, labelAlertStatus } from "@/lib/ui/labels";
import { useAlertStore } from "@/stores/useAlertStore";

type AlertRow = { id: string; status: string; severity?: string; nodeId?: string };

function severityTone(s?: string): string {
  const u = (s ?? "").toUpperCase();
  if (u.includes("CRITICAL") || u.includes("CRIT")) return "bg-red-950/50 text-red-200 ring-1 ring-red-800/50";
  if (u.includes("WARN")) return "bg-amber-950/40 text-amber-100 ring-1 ring-amber-800/40";
  if (u.includes("INFO")) return "bg-accent-blue/15 text-accent-blue ring-1 ring-accent-blue/30";
  return "bg-slate-800/80 text-slate-300 ring-1 ring-white/10";
}

function statusTone(st: string): string {
  const u = st.toUpperCase();
  if (u.includes("ACTIVE") || u.includes("OPEN")) return "text-red-300";
  if (u.includes("RESOLV") || u.includes("CLOSE")) return "text-slate-400";
  return "text-slate-300";
}

export default function AlertsPage() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsItems = useAlertStore((s) => s.items);
  const [crit, setCrit] = useState(true);
  const [warn, setWarn] = useState(true);
  const [info, setInfo] = useState(true);
  const [other, setOther] = useState(true);

  useEffect(() => {
    apiJson<AlertRow[]>("alerts")
      .then(setRows)
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
      });
  }, []);

  const merged = useMemo(() => {
    const list = [...wsItems, ...rows].filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);
    return list;
  }, [rows, wsItems]);

  const filtered = useMemo(() => {
    return merged.filter((a) => {
      const s = (a.severity ?? "").toUpperCase();
      if (s.includes("CRITICAL") || s.includes("CRIT")) return crit;
      if (s.includes("WARN")) return warn;
      if (s.includes("INFO")) return info;
      return other;
    });
  }, [merged, crit, warn, info, other]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Gestión de alertas"
        description="Listado del sistema; las alertas nuevas pueden llegar en tiempo real por el canal en vivo. Filtra por severidad en el panel (en pantallas anchas queda a la izquierda)."
      />
      {error ? <p className="mb-4 text-sm text-amber-400">{error}</p> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside className="mx-auto w-full max-w-md rounded-xl border border-white/10 bg-surface-elevated/60 p-4 lg:sticky lg:top-[4.75rem] lg:mx-0 lg:max-w-none lg:self-start">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Filtrar por severidad</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <input id="f-crit" type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} className="rounded border-white/20 bg-app" />
              <label htmlFor="f-crit" className="text-red-300">
                Crítica
              </label>
            </li>
            <li className="flex items-center gap-2">
              <input id="f-warn" type="checkbox" checked={warn} onChange={(e) => setWarn(e.target.checked)} className="rounded border-white/20 bg-app" />
              <label htmlFor="f-warn" className="text-amber-200">
                Advertencia
              </label>
            </li>
            <li className="flex items-center gap-2">
              <input id="f-info" type="checkbox" checked={info} onChange={(e) => setInfo(e.target.checked)} className="rounded border-white/20 bg-app" />
              <label htmlFor="f-info" className="text-accent-blue">
                Info
              </label>
            </li>
            <li className="flex items-center gap-2">
              <input id="f-oth" type="checkbox" checked={other} onChange={(e) => setOther(e.target.checked)} className="rounded border-white/20 bg-app" />
              <label htmlFor="f-oth" className="text-slate-400">
                Otras / sin severidad
              </label>
            </li>
          </ul>
          <button
            type="button"
            className="mt-4 w-full rounded-lg border border-white/15 py-2 text-xs text-slate-400 hover:bg-white/5"
            onClick={() => {
              setCrit(true);
              setWarn(true);
              setInfo(true);
              setOther(true);
            }}
          >
            Restablecer filtros
          </button>
        </aside>

        <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-white/10 bg-surface-elevated/40">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-xs text-slate-500">
              Mostrando <span className="font-mono text-slate-300">{filtered.length}</span> de {merged.length} alertas
            </p>
            <Link href="/alerts/rules" className="text-xs text-accent hover:underline">
              Umbrales y reglas →
            </Link>
          </div>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">ID / enlace</th>
                <th className="px-4 py-3 font-medium">Nodo</th>
                <th className="px-4 py-3 font-medium">Severidad</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">
                    <Link href={`/alerts/${a.id}`} className="text-accent hover:underline">
                      {a.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{a.nodeId ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${severityTone(a.severity)}`}>
                      {labelAlertSeverity(a.severity)}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs ${statusTone(a.status)}`}>{labelAlertStatus(a.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/alerts/${a.id}`} className="text-xs text-accent hover:underline">
                      Detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No hay alertas con los filtros actuales.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
