"use client";

import { useEffect, useState } from "react";
import { DatePicker } from "@/components/ui/DatePicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { useTailingDamOptions } from "@/hooks/useTailingDamOptions";
import { dayInputToRangeEndIso, dayInputToRangeStartIso } from "@/lib/dates";
import { ApiError, apiFetch, apiJson, withQuery } from "@/lib/api/http";
import { labelReportFormat } from "@/lib/ui/labels";
import { useSessionStore } from "@/stores/useSessionStore";

type Report = {
  id: string;
  type: string;
  format: string;
  tailingDamId?: string | null;
  from: string;
  to: string;
  generatedBy?: string;
  storageKey?: string;
};

const TYPES = ["REGULATORY_OEFA", "ALERT_HISTORY", "INSPECTION_SUMMARY"] as const;
const FORMATS = ["PDF", "EXCEL"] as const;

const TYPE_LABEL: Record<(typeof TYPES)[number], string> = {
  REGULATORY_OEFA: "OEFA / cumplimiento",
  ALERT_HISTORY: "Historial de alertas",
  INSPECTION_SUMMARY: "Resumen de inspecciones",
};

export default function ReportsPage() {
  const user = useSessionStore((s) => s.user);
  const { options: tailingDamOptions, getTailingDamLabel } = useTailingDamOptions(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tailingDamId, setTailingDamId] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("ALERT_HISTORY");
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("PDF");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    useSessionStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (user?.tailingDamIds?.length && !tailingDamId) {
      setTailingDamId(user.tailingDamIds[0]);
    }
  }, [user, tailingDamId]);

  function load() {
    setError(null);
    const q = tailingDamId.trim() ? withQuery("reports", { tailingDamId: tailingDamId.trim() }) : "reports";
    apiJson<Report[]>(q)
      .then(setReports)
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al listar");
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (from > to) {
        setError("La fecha inicial no puede ser posterior a la final.");
        return;
      }
      const fromIso = dayInputToRangeStartIso(from);
      const toIso = dayInputToRangeEndIso(to);
      await apiJson<Report>("reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          from: fromIso,
          to: toIso,
          format,
          tailingDamId: tailingDamId.trim() || null,
        }),
      });
      load();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.body ?? `Error ${err.status}` : "Error al generar");
    } finally {
      setBusy(false);
    }
  }

  async function download(reportId: string, formatHint?: string) {
    setError(null);
    try {
      const res = await apiFetch(`reports/${reportId}/content`);
      if (!res.ok) {
        const text = await res.text();
        throw new ApiError(`HTTP ${res.status}`, res.status, text);
      }
      const blob = await res.blob();
      const ext =
        formatHint === "EXCEL" || formatHint === "XLSX"
          ? "xlsx"
          : formatHint === "PDF"
            ? "pdf"
            : "bin";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-${reportId.slice(0, 8)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.body ?? `Error ${err.status}` : "Error al descargar");
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Operación" title="Reportes regulatorios y operativos" />
      {error ? <p className="mb-4 text-sm text-amber-400">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-2 xl:gap-8">
        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-white/10 bg-surface-elevated/60 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Parámetros del informe</p>
            <form onSubmit={(ev) => void generate(ev)} className="mt-4 space-y-4 text-sm">
              <div>
                <label className="text-xs text-slate-500">Tranque</label>
                {tailingDamOptions.length > 0 ? (
                  <select
                    value={tailingDamId}
                    onChange={(e) => setTailingDamId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100 outline-none focus:border-accent/50"
                  >
                    <option value="">Todos los tranques asignados</option>
                    {tailingDamOptions.map((dam) => (
                      <option key={dam.id} value={dam.id}>
                        {dam.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={tailingDamId}
                    onChange={(e) => setTailingDamId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100 outline-none focus:border-accent/50"
                    placeholder="Opcional — filtra por tranque"
                  />
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500">Tipo de reporte</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100 outline-none focus:border-accent/50"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Formato de salida</label>
                <div className="mt-2 flex gap-2">
                  {FORMATS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                        format === f
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      {labelReportFormat(f)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DatePicker
                  id="report-from"
                  label="Desde"
                  value={from}
                  onChange={setFrom}
                  required
                  max={to || undefined}
                />
                <DatePicker
                  id="report-to"
                  label="Hasta"
                  value={to}
                  onChange={setTo}
                  required
                  min={from || undefined}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover disabled:opacity-50"
                >
                  {busy ? "Generando…" : "Generar reporte"}
                </button>
                <button
                  type="button"
                  onClick={() => load()}
                  className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                >
                  Actualizar listado
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-white/10 bg-surface-elevated/50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tipos de informe</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>· OEFA: formato orientado a cumplimiento ambiental.</li>
              <li>· Historial de alertas: trazabilidad de eventos por periodo.</li>
              <li>· Inspecciones: síntesis de rondas de campo (cuando aplique).</li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-surface-elevated/50 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">Historial generado</p>
              <span className="font-mono text-[11px] text-slate-500">{reports.length} archivos</span>
            </div>
            <ul className="mt-4 max-h-[min(50vh,420px)] space-y-2 overflow-y-auto pr-1 text-sm">
              {reports.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-app/40 px-3 py-2.5"
                >
                  <div>
                    <p className="text-slate-200">{TYPE_LABEL[r.type as keyof typeof TYPE_LABEL] ?? r.type}</p>
                    <p className="font-mono text-[11px] text-slate-500">
                      {labelReportFormat(r.format)} · {r.from?.slice(0, 10)} … {r.to?.slice(0, 10)}
                      {r.tailingDamId ? (
                        <>
                          {" "}
                          · {getTailingDamLabel(r.tailingDamId)}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void download(r.id, r.format)}
                    className="shrink-0 text-xs font-medium text-accent hover:underline"
                  >
                    Descargar
                  </button>
                </li>
              ))}
            </ul>
            {reports.length === 0 ? <p className="mt-4 text-center text-sm text-slate-500">Aún no hay reportes listados.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
