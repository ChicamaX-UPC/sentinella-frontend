"use client";

type Props = {
  totalNodes?: number;
  activeAlerts?: number;
  criticalAlerts?: number;
  loading?: boolean;
};

export function SiteOpsBanner({ totalNodes, activeAlerts, criticalAlerts, loading }: Props) {
  const critical = (criticalAlerts ?? 0) > 0;
  const warning = (activeAlerts ?? 0) > 0 && !critical;

  const label = loading
    ? "Cargando estado del sitio…"
    : critical
      ? "ATENCIÓN — alertas críticas activas"
      : warning
        ? "Operación — revise alertas abiertas"
        : "Estado del sitio: dentro de parámetros normales";

  const barClass = critical
    ? "bg-red-950/50 text-red-200 border-red-800/40"
    : warning
      ? "bg-amber-950/40 text-amber-100 border-amber-800/35"
      : "bg-accent/10 text-slate-200 border-accent/25";

  return (
    <div
      className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-xs sm:text-sm ${barClass}`}
      role="status"
    >
      <span className="font-medium">{label}</span>
      {!loading ? (
        <span className="font-mono text-[11px] text-slate-400">
          Nodos {totalNodes ?? "—"} · Alertas {activeAlerts ?? "—"} · Críticas {criticalAlerts ?? "—"}
        </span>
      ) : null}
    </div>
  );
}
