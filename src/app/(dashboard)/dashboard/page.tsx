"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardNodesMapSection } from "@/components/dashboard/DashboardNodesMapSection";
import { KpiStatCard } from "@/components/dashboard/KpiStatCard";
import { SiteOpsBanner } from "@/components/dashboard/SiteOpsBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError, apiJson } from "@/lib/api/http";
import { useSessionStore } from "@/stores/useSessionStore";

type Executive = {
  totalNodes?: number;
  activeAlerts?: number;
  criticalAlerts?: number;
  nodesWithRecentData?: number;
};

type FieldKpi = {
  activeAlerts?: number;
  roundsInProgress?: number;
  pendingSyncRounds?: number;
};

function IconGauge() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 22v-4M19.07 19.07l-2.83-2.83M22 12h-4M19.07 4.93l-2.83 2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 9v4M12 17h.01M10.3 4.7h3.4l8 14H2.3l8-14z" />
    </svg>
  );
}

function IconNodes() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h7v7h-7z" />
    </svg>
  );
}

export default function ExecutiveDashboardPage() {
  const user = useSessionStore((s) => s.user);
  const [kpi, setKpi] = useState<Executive | null>(null);
  const [field, setField] = useState<FieldKpi | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  useEffect(() => {
    useSessionStore.getState().hydrate();
  }, []);

  useEffect(() => {
    setKpiLoading(true);
    apiJson<Executive>("dashboard/executive")
      .then((d) => {
        setKpi(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError) {
          setError(`No se pudieron cargar KPI (${e.status})`);
        } else {
          setError("No se pudieron cargar KPI");
        }
      })
      .finally(() => {
        setKpiLoading(false);
      });
  }, []);

  useEffect(() => {
    const role = user?.role;
    if (!role || role === "READ_ONLY") {
      return;
    }
    setFieldError(null);
    apiJson<FieldKpi>("dashboard/field")
      .then(setField)
      .catch((e: unknown) => {
        if (e instanceof ApiError) {
          setFieldError(`Campo: ${e.status}`);
        } else {
          setFieldError("Campo: error");
        }
      });
  }, [user?.role]);

  const nodesTotal = kpi?.totalNodes ?? 0;
  const nodesOnline = kpi?.nodesWithRecentData ?? 0;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Inicio" title="Panel ejecutivo" />

      <SiteOpsBanner
        loading={kpiLoading}
        totalNodes={kpi?.totalNodes}
        activeAlerts={kpi?.activeAlerts}
        criticalAlerts={kpi?.criticalAlerts}
      />

      {error ? <p className="mb-4 rounded-lg border border-amber-800/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">{error}</p> : null}

      <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiStatCard
          label="Nodos de monitoreo"
          value={kpi?.totalNodes ?? "—"}
          hint="Registrados en el tranque"
          variant="blue"
          icon={<IconNodes />}
        />
        <KpiStatCard
          label="Alertas activas"
          value={kpi?.activeAlerts ?? "—"}
          hint={kpi?.criticalAlerts ? `${kpi.criticalAlerts} críticas` : "Sin críticas"}
          variant={kpi?.criticalAlerts ? "critical" : "accent"}
          icon={<IconAlert />}
        />
        <KpiStatCard
          label="Nodos con telemetría reciente"
          value={kpi?.nodesWithRecentData ?? "—"}
          hint={nodesTotal ? `${Math.round((nodesOnline / Math.max(nodesTotal, 1)) * 100)}% con datos (última hora)` : undefined}
          variant="default"
          icon={<IconGauge />}
        />
        <KpiStatCard
          label="Cobertura de datos"
          value={nodesTotal ? `${nodesOnline}/${nodesTotal}` : "—"}
          hint="Nodos con lectura en la última hora"
          variant="accent"
          icon={<IconGauge />}
        />
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section id="mapa-nodos" className="min-w-0 scroll-mt-24 lg:col-span-2">
          <div className="mb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Mapa de nodos</h2>
            <p className="mt-0.5 text-xs text-slate-500">Posiciones desde el API; zoom y popups en cada marcador.</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-elevated/60 p-2">
            <DashboardNodesMapSection />
          </div>
        </section>

        <aside className="min-w-0 rounded-xl border border-white/10 bg-surface-elevated/50 p-4">
          <h2 className="text-sm font-semibold text-slate-200">Actividad reciente</h2>
          <p className="mt-1 text-xs text-slate-500">
            Enlaces rápidos. El detalle en tiempo real de alertas llega por WebSocket en la vista de alertas.
          </p>
          <ul className="mt-4 space-y-3 border-t border-white/10 pt-4 text-xs">
            <li className="flex gap-2 border-l-2 border-accent pl-2">
              <span className="font-mono text-[10px] text-slate-500">Ahora</span>
              <span>
                <Link href="/alerts" className="text-slate-200 hover:text-accent">
                  Ver cola de alertas
                </Link>
              </span>
            </li>
            <li className="flex gap-2 border-l-2 border-accent-blue pl-2">
              <span className="font-mono text-[10px] text-slate-500">Campo</span>
              <span>
                <Link href="/inspections" className="text-slate-200 hover:text-accent">
                  Rondas de inspección
                </Link>
              </span>
            </li>
          </ul>
        </aside>
      </div>

      {fieldError ? <p className="mt-8 text-xs text-slate-500">{fieldError}</p> : null}
      {field ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-surface-elevated/40 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Operaciones de campo</h2>
          <p className="text-xs text-slate-500">Indicadores de campo según tu perfil.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-app/50 px-3 py-3 text-sm text-slate-300">
              <span className="text-[11px] text-slate-500">Alertas (campo)</span>
              <p className="mt-1 font-mono text-lg">{field.activeAlerts ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-app/50 px-3 py-3 text-sm text-slate-300">
              <span className="text-[11px] text-slate-500">Rondas en curso</span>
              <p className="mt-1 font-mono text-lg">{field.roundsInProgress ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-app/50 px-3 py-3 text-sm text-slate-300">
              <span className="text-[11px] text-slate-500">Sync pendiente</span>
              <p className="mt-1 font-mono text-lg">{field.pendingSyncRounds ?? "—"}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
