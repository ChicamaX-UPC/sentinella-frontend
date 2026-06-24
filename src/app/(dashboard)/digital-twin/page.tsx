"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { TWIN_SIMULATIONS } from "@/components/DigitalTwin/simulations";
import { TwinMetrics } from "@/components/DigitalTwin/scene/SimulationEffects";
import { ScenarioLoader } from "@/components/DigitalTwin/ui/ScenarioLoader";
import { SensorPanel } from "@/components/DigitalTwin/ui/SensorPanel";
import { SimulationControls } from "@/components/DigitalTwin/ui/SimulationControls";
import {
  DESIGN_RAIN_MM_H,
  MIN_FREEBOARD_M,
  RAIN_WARNING_MM_H,
  SEEPAGE_CRITICAL_L_MIN,
  SEEPAGE_WARNING_L_MIN,
} from "@/components/DigitalTwin/constants";
import { ApiError, apiJson, withQuery } from "@/lib/api/http";
import type { PageResponse } from "@/lib/api/page";
import { ApiSimulationScenario } from "@/lib/digitalTwin/scenarioAdapter";
import { useSimulationStore } from "@/stores/useSimulationStore";

const TwinCanvas = dynamic(() => import("@/components/DigitalTwin/TwinCanvas"), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-500">Cargando gemelo digital (Three.js)…</p>,
});

type TwinNode = {
  id: string;
  externalId?: string;
  name: string;
  sensorType?: string;
  status?: string;
};

function DigitalTwinPageContent() {
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get("scenario");
  const [nodes, setNodes] = useState<TwinNode[]>([]);
  const [selected, setSelected] = useState<{
    nodeId: string;
    name: string;
    status: string;
    value?: number;
    unit?: string;
  } | null>(null);
  const [metrics, setMetrics] = useState<TwinMetrics>({
    relaveLevel: 780,
    freeboard: 6,
    rainIntensity: 0,
    safetyFactor: 1.6,
    seepageFlow: 0,
    piezometricPressure: 0.35,
    spillSeverity: 0,
    spillM: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const mode = useSimulationStore((s) => s.mode);
  const setMode = useSimulationStore((s) => s.setMode);
  const loadApiScenario = useSimulationStore((s) => s.loadApiScenario);

  useEffect(() => {
    apiJson<PageResponse<TwinNode>>(withQuery("nodes", { page: 0, limit: 200 }))
      .then((res) => setNodes(res.content))
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "No se pudieron cargar los nodos");
      });
  }, []);

  useEffect(() => {
    if (!scenarioId) return;
    apiJson<ApiSimulationScenario>(`simulation-scenarios/${scenarioId}`)
      .then((scenario) => loadApiScenario(scenario, true))
      .catch(() => {
        setError("No se pudo cargar el escenario desde la API");
      });
  }, [scenarioId, loadApiScenario]);

  const simulatedEvents = useMemo(() => {
    const events: string[] = [];
    if (metrics.rainIntensity >= DESIGN_RAIN_MM_H) {
      events.push("Lluvia crítica: canal sobre capacidad de diseño (≥45 mm/h).");
    } else if (metrics.rainIntensity >= RAIN_WARNING_MM_H) {
      events.push("Lluvia en warning: canal cerca del 70%.");
    }
    if (metrics.freeboard < MIN_FREEBOARD_M && metrics.freeboard >= 0) {
      events.push("Riesgo de desborde: borde libre menor a 1 m (MINEM).");
    }
    if (metrics.freeboard < 0) {
      events.push("Desborde activo: relave sobrepasó la corona del dique (786 msnm).");
    }
    if (metrics.safetyFactor <= 1) {
      events.push("FS crítico: falla inminente del talud.");
    } else if (metrics.safetyFactor <= 1.2) {
      events.push("FS en warning: estabilidad comprometida.");
    }
    if (metrics.seepageFlow >= SEEPAGE_CRITICAL_L_MIN) {
      events.push("Filtración crítica: riesgo de piping.");
    } else if (metrics.seepageFlow >= SEEPAGE_WARNING_L_MIN) {
      events.push("Filtración detectada: monitoreo reforzado.");
    }
    if (!events.length) {
      events.push("Escenario controlado sin imprevistos.");
    }
    return events;
  }, [metrics]);

  return (
    <div>
      <PageHeader eyebrow="Operación" title="Gemelo digital" />
      {error ? <p className="mb-3 text-sm text-amber-400">{error}</p> : null}
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="relative">
          <TwinCanvas nodes={nodes} onSelectSensor={setSelected} onMetricsChange={setMetrics} />
          <div className="twin-alert-legend pointer-events-none absolute bottom-3 left-3 rounded-md border border-accent/20 bg-background/90 p-2 text-xs shadow-sm backdrop-blur-sm">
            <p className="font-medium text-foreground/90">Leyenda</p>
            <p className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              Borde libre &lt; 1 m (MINEM)
            </p>
            <p className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
              Rebose activo (vertedero)
            </p>
            <p className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-red-700" />
              FS crítico (talud)
            </p>
          </div>
        </div>
        <aside className="dash-panel space-y-4 rounded-lg p-4 text-sm">
          <div>
            <p className="dash-panel__label text-xs uppercase tracking-wide">Modo del gemelo</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setMode("REAL")}
                className={`dash-segment-btn ${mode === "REAL" ? "dash-segment-btn--active" : ""}`}
              >
                En vivo
              </button>
              <button
                type="button"
                onClick={() => setMode("SIMULATION")}
                className={`dash-segment-btn ${mode === "SIMULATION" ? "dash-segment-btn--active" : ""}`}
              >
                Simulación
              </button>
            </div>
          </div>

          <ScenarioLoader disabled={mode === "REAL"} />
          <SimulationControls metrics={metrics} simulatedEvents={simulatedEvents} />
          <SensorPanel selected={selected} />
        </aside>
      </div>
    </div>
  );
}

export default function DigitalTwinPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Cargando gemelo digital…</p>}>
      <DigitalTwinPageContent />
    </Suspense>
  );
}
