"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SimulationControl, TWIN_SIMULATIONS } from "@/components/DigitalTwin/simulations";
import { TwinMetrics } from "@/components/DigitalTwin/scene/SimulationEffects";
import { ApiError, apiJson } from "@/lib/api/http";
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

export default function DigitalTwinPage() {
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
  });
  const [error, setError] = useState<string | null>(null);
  const mode = useSimulationStore((s) => s.mode);
  const simulationType = useSimulationStore((s) => s.simulationType);
  const combinedMode = useSimulationStore((s) => s.combinedMode);
  const combinedScenarios = useSimulationStore((s) => s.combinedScenarios);
  const params = useSimulationStore((s) => s.params);
  const running = useSimulationStore((s) => s.running);
  const playbackSpeed = useSimulationStore((s) => s.playbackSpeed);
  const showIsolines = useSimulationStore((s) => s.showIsolines);
  const showSaturationMap = useSimulationStore((s) => s.showSaturationMap);
  const showFlowVector = useSimulationStore((s) => s.showFlowVector);
  const setMode = useSimulationStore((s) => s.setMode);
  const setSimulationType = useSimulationStore((s) => s.setSimulationType);
  const setCombinedMode = useSimulationStore((s) => s.setCombinedMode);
  const toggleCombinedScenario = useSimulationStore((s) => s.toggleCombinedScenario);
  const setParam = useSimulationStore((s) => s.setParam);
  const setPlaybackSpeed = useSimulationStore((s) => s.setPlaybackSpeed);
  const setShowIsolines = useSimulationStore((s) => s.setShowIsolines);
  const setShowSaturationMap = useSimulationStore((s) => s.setShowSaturationMap);
  const setShowFlowVector = useSimulationStore((s) => s.setShowFlowVector);
  const run = useSimulationStore((s) => s.run);
  const pause = useSimulationStore((s) => s.pause);
  const stop = useSimulationStore((s) => s.stop);

  useEffect(() => {
    apiJson<TwinNode[]>("nodes")
      .then(setNodes)
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "No se pudieron cargar los nodos");
      });
  }, []);

  const simulation = useMemo(
    () => TWIN_SIMULATIONS.find((s) => s.id === simulationType) ?? TWIN_SIMULATIONS[0],
    [simulationType]
  );
  const activeControls = useMemo(() => {
    if (!combinedMode) {
      return simulation.controls;
    }
    const activeIds = new Set([simulationType, ...combinedScenarios]);
    const merged = new Map<string, SimulationControl>();
    for (const scenario of TWIN_SIMULATIONS) {
      if (!activeIds.has(scenario.id)) {
        continue;
      }
      scenario.controls.forEach((control) => {
        if (!merged.has(control.key)) {
          merged.set(control.key, control);
        }
      });
    }
    return [...merged.values()];
  }, [combinedMode, simulation.controls, simulationType, combinedScenarios]);
  const simulatedEvents = useMemo(() => {
    const events: string[] = [];
    if (metrics.rainIntensity >= 45) {
      events.push("Lluvia critica: canal sobre capacidad de diseno.");
    } else if (metrics.rainIntensity >= 30) {
      events.push("Lluvia en warning: canal cerca del 70%.");
    }
    if (metrics.freeboard < 1) {
      events.push("Riesgo de desborde: borde libre menor a 1m.");
    }
    if (metrics.freeboard < 0) {
      events.push("Desborde activo: relave sobrepaso la corona del dique.");
    }
    if (metrics.freeboard <= -1.4 && metrics.freeboard >= -1.55) {
      events.push("Escenario ~1,5m de rebose: cota del espejo cercana a 787,5 msnm (tope de simulacion).");
    }
    if (metrics.safetyFactor <= 1) {
      events.push("FS critico: falla inminente del talud.");
    } else if (metrics.safetyFactor <= 1.2) {
      events.push("FS en warning: estabilidad comprometida.");
    }
    if (metrics.seepageFlow >= 20) {
      events.push("Filtracion critica: riesgo de piping.");
    } else if (metrics.seepageFlow >= 5) {
      events.push("Filtracion detectada: monitoreo reforzado.");
    }
    if (!events.length) {
      events.push("Escenario controlado sin imprevistos.");
    }
    return events;
  }, [metrics]);

  return (
    <div>
      <PageHeader
        title="Gemelo digital"
        description="Escena 3D del tranque con telemetría y modos en vivo o simulación. Los datos llegan por los servicios habituales de la aplicación."
      />
      {error ? <p className="mb-3 text-sm text-amber-400">{error}</p> : null}
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <TwinCanvas nodes={nodes} onSelectSensor={setSelected} onMetricsChange={setMetrics} />
        <aside className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Modo del gemelo</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setMode("REAL")}
                className={`rounded-md px-3 py-1.5 ${mode === "REAL" ? "bg-accent text-white" : "bg-slate-800 text-slate-300"}`}
              >
                En vivo
              </button>
              <button
                type="button"
                onClick={() => setMode("SIMULATION")}
                className={`rounded-md px-3 py-1.5 ${mode === "SIMULATION" ? "bg-accent text-white" : "bg-slate-800 text-slate-300"}`}
              >
                Simulación
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Línea de tiempo</p>
            <div className="mt-2 flex gap-2">
              {[1, 10, 30].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setPlaybackSpeed(speed as 1 | 10 | 30)}
                  className={`rounded-md px-3 py-1.5 ${playbackSpeed === speed ? "bg-accent-blue text-white" : "bg-slate-800 text-slate-300"}`}
                  disabled={mode !== "SIMULATION"}
                >
                  x{speed}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <label className="text-xs uppercase tracking-wide text-slate-500">Escenario visual</label>
            <select
              value={simulationType}
              onChange={(e) => setSimulationType(e.target.value as typeof simulationType)}
              disabled={mode !== "SIMULATION"}
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-sm disabled:opacity-50"
            >
              {TWIN_SIMULATIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <label className="mt-3 flex items-center gap-2 text-slate-300">
              <input type="checkbox" checked={combinedMode} onChange={(e) => setCombinedMode(e.target.checked)} disabled={mode !== "SIMULATION"} />
              Combinar escenarios simultaneos
            </label>
            {combinedMode ? (
              <div className="mt-2 space-y-1 rounded-md border border-slate-800 bg-slate-900 p-2 text-xs text-slate-300">
                {TWIN_SIMULATIONS.filter((s) => s.id !== simulationType).map((scenarioItem) => (
                  <label key={scenarioItem.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={combinedScenarios.includes(scenarioItem.id)}
                      onChange={() => toggleCombinedScenario(scenarioItem.id)}
                      disabled={mode !== "SIMULATION"}
                    />
                    {scenarioItem.label}
                  </label>
                ))}
              </div>
            ) : null}
            <div className="mt-3 space-y-2">
              {activeControls.map((c) => {
                if (c.type === "select") {
                  const selectedValue = String(params[c.key] ?? c.options?.[0] ?? "");
                  return (
                    <label key={c.key} className="block">
                      <span className="text-xs text-slate-400">{c.label}</span>
                      <select
                        value={selectedValue}
                        disabled={mode !== "SIMULATION"}
                        onChange={(e) => setParam(c.key, e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-sm disabled:opacity-50"
                      >
                        {(c.options ?? []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                const min = c.min ?? 0;
                const max = c.max ?? 100;
                const step = c.step ?? 1;
                const unit = c.unit ?? "";
                const v = Number(params[c.key] ?? min);
                return (
                  <label key={c.key} className="block">
                    <span className="text-xs text-slate-400">
                      {c.label}: {v.toFixed(step < 1 ? 2 : 0)} {unit}
                    </span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={v}
                      disabled={mode !== "SIMULATION"}
                      onChange={(e) => setParam(c.key, Number(e.target.value))}
                      className="mt-1 w-full"
                    />
                  </label>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => run()}
                disabled={mode !== "SIMULATION"}
                className="rounded-md bg-accent px-3 py-1.5 text-white disabled:opacity-50"
              >
                Ejecutar
              </button>
              <button
                type="button"
                onClick={() => pause()}
                disabled={mode !== "SIMULATION" || !running}
                className="rounded-md bg-slate-700 px-3 py-1.5 text-slate-100 disabled:opacity-50"
              >
                Pausar
              </button>
              <button
                type="button"
                onClick={() => stop()}
                disabled={mode !== "SIMULATION"}
                className="rounded-md bg-rose-700 px-3 py-1.5 text-slate-100 disabled:opacity-50"
              >
                Detener
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Capas visuales</p>
            <label className="mt-2 flex items-center gap-2 text-slate-300">
              <input type="checkbox" checked={showIsolines} onChange={(e) => setShowIsolines(e.target.checked)} />
              Mostrar isolineas
            </label>
            <label className="mt-2 flex items-center gap-2 text-slate-300">
              <input type="checkbox" checked={showSaturationMap} onChange={(e) => setShowSaturationMap(e.target.checked)} />
              Mostrar mapa de saturacion
            </label>
            <label className="mt-2 flex items-center gap-2 text-slate-300">
              <input type="checkbox" checked={showFlowVector} onChange={(e) => setShowFlowVector(e.target.checked)} />
              Mostrar vector de escorrentia
            </label>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Metricas en vivo</p>
            <div className="mt-2 space-y-1 rounded-md border border-slate-800 bg-slate-900 p-3 text-slate-300">
              <p>Nivel relave: {metrics.relaveLevel.toFixed(2)} msnm</p>
              <p className={metrics.freeboard < 1 ? "text-amber-300" : ""}>Borde libre: {metrics.freeboard.toFixed(2)} m</p>
              <p>Intensidad lluvia: {metrics.rainIntensity.toFixed(1)} mm/h</p>
              <p>FS estimado: {metrics.safetyFactor.toFixed(2)}</p>
              <p>Caudal filtracion: {metrics.seepageFlow.toFixed(1)} L/min</p>
            </div>
            <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Mapa de eventos simulados</p>
            <div className="mt-2 space-y-1 rounded-md border border-slate-800 bg-slate-900 p-3 text-slate-300">
              {simulatedEvents.map((event) => (
                <p key={event}>- {event}</p>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Sensor seleccionado</p>
            {selected ? (
              <div className="mt-2 rounded-md border border-slate-800 bg-slate-900 p-3">
                <p className="font-medium text-slate-100">{selected.name}</p>
                <p className="text-slate-400">Estado: {selected.status}</p>
                {typeof selected.value === "number" ? (
                  <p className="text-slate-300">
                    Lectura: {selected.value} {selected.unit ?? ""}
                  </p>
                ) : (
                  <p className="text-slate-500">Sin lectura reciente por WS</p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-slate-500">Haz click sobre un nodo para ver su estado y lectura.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
