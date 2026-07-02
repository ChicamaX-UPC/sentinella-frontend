"use client";

import { SimulationControl, TWIN_SIMULATIONS, OVERFLOW_DEMO_PARAMS } from "@/components/DigitalTwin/simulations";
import { TwinMetrics } from "@/components/DigitalTwin/scene/SimulationEffects";
import { SimulationType, useSimulationStore } from "@/stores/useSimulationStore";
import { FSGauge } from "./FSGauge";

type Props = {
  metrics: TwinMetrics;
  simulatedEvents: string[];
};

export function SimulationControls({ metrics, simulatedEvents }: Props) {
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
  const showSensorLabels = useSimulationStore((s) => s.showSensorLabels);
  const focusCamera = useSimulationStore((s) => s.focusCamera);
  const loadedScenarioName = useSimulationStore((s) => s.loadedScenarioName);
  const setParam = useSimulationStore((s) => s.setParam);
  const setSimulationType = useSimulationStore((s) => s.setSimulationType);
  const setCombinedMode = useSimulationStore((s) => s.setCombinedMode);
  const toggleCombinedScenario = useSimulationStore((s) => s.toggleCombinedScenario);
  const setPlaybackSpeed = useSimulationStore((s) => s.setPlaybackSpeed);
  const setShowIsolines = useSimulationStore((s) => s.setShowIsolines);
  const setShowSaturationMap = useSimulationStore((s) => s.setShowSaturationMap);
  const setShowFlowVector = useSimulationStore((s) => s.setShowFlowVector);
  const setShowSensorLabels = useSimulationStore((s) => s.setShowSensorLabels);
  const run = useSimulationStore((s) => s.run);
  const pause = useSimulationStore((s) => s.pause);
  const stop = useSimulationStore((s) => s.stop);

  const simulation = TWIN_SIMULATIONS.find((s) => s.id === simulationType) ?? TWIN_SIMULATIONS[0];
  const activeIds = new Set<SimulationType>([simulationType, ...combinedScenarios]);
  const activeControls: SimulationControl[] = [];
  const seen = new Set<string>();
  if (!combinedMode) {
    activeControls.push(...simulation.controls);
  } else {
    for (const sc of TWIN_SIMULATIONS) {
      if (!activeIds.has(sc.id)) continue;
      for (const c of sc.controls) {
        if (!seen.has(c.key)) {
          seen.add(c.key);
          activeControls.push(c);
        }
      }
    }
  }

  return (
    <>
      <div className="dash-panel__section">
        <p className="dash-panel__label text-xs uppercase tracking-wide">Línea de tiempo</p>
        <div className="mt-2 flex gap-2">
          {[1, 10, 30].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => setPlaybackSpeed(speed as 1 | 10 | 30)}
              className={`dash-segment-btn dash-segment-btn--blue ${playbackSpeed === speed ? "dash-segment-btn--active" : ""}`}
              disabled={mode !== "SIMULATION"}
            >
              x{speed}
            </button>
          ))}
        </div>
      </div>

      <div className="dash-panel__section">
        <label className="dash-panel__label text-xs uppercase tracking-wide">Escenario visual</label>
        {loadedScenarioName ? (
          <p className="mt-1 text-xs text-accent">Cargado: {loadedScenarioName}</p>
        ) : null}
        <select
          value={simulationType}
          onChange={(e) => setSimulationType(e.target.value as SimulationType)}
          disabled={mode !== "SIMULATION"}
          className="dash-field mt-2 w-full rounded-md px-2 py-2 text-sm disabled:opacity-50"
        >
          {TWIN_SIMULATIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <p className="dash-panel__text-muted mt-2 text-xs">{simulation.description}</p>
        {mode === "SIMULATION" ? (
          <button
            type="button"
            className="dash-segment-btn mt-2 text-xs"
            onClick={() => {
              setSimulationType("OVERFLOW_DEMO");
              Object.entries(OVERFLOW_DEMO_PARAMS).forEach(([k, v]) => setParam(k, v));
            }}
          >
            Cargar preset desborde (tormenta 60 mm/h · 785.8 msnm)
          </button>
        ) : null}
        <label className="dash-check-label mt-3 flex items-center gap-2">
          <input type="checkbox" checked={combinedMode} onChange={(e) => setCombinedMode(e.target.checked)} disabled={mode !== "SIMULATION"} />
          Combinar escenarios simultáneos
        </label>
        {combinedMode ? (
          <div className="dash-inset-box mt-2 space-y-1 rounded-md p-2 text-xs">
            {TWIN_SIMULATIONS.filter((s) => s.id !== simulationType).map((scenarioItem) => (
              <label key={scenarioItem.id} className="dash-check-label flex items-center gap-2">
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
                  <span className="dash-panel__text-muted text-xs">{c.label}</span>
                  <select
                    value={selectedValue}
                    disabled={mode !== "SIMULATION"}
                    onChange={(e) => setParam(c.key, e.target.value)}
                    className="dash-field mt-1 w-full rounded-md px-2 py-2 text-sm disabled:opacity-50"
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
                <span className="dash-panel__text-muted text-xs">
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
            className="dash-segment-btn dash-segment-btn--active disabled:opacity-50"
          >
            Ejecutar
          </button>
          <button
            type="button"
            onClick={() => pause()}
            disabled={mode !== "SIMULATION" || !running}
            className="dash-segment-btn disabled:opacity-50"
          >
            Pausar
          </button>
          <button
            type="button"
            onClick={() => stop()}
            disabled={mode !== "SIMULATION"}
            className="rounded-md bg-rose-700 px-3 py-1.5 text-white disabled:opacity-50"
          >
            Detener
          </button>
        </div>
      </div>

      <div className="dash-panel__section">
        <p className="dash-panel__label text-xs uppercase tracking-wide">Vista de cámara</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => focusCamera("overview")} className="dash-segment-btn">
            Vista general
          </button>
          <button
            type="button"
            onClick={() => focusCamera("weir")}
            className="dash-segment-btn dash-segment-btn--blue"
          >
            Ver vertedero
          </button>
          <button type="button" onClick={() => focusCamera("crown")} className="dash-segment-btn">
            Corona
          </button>
          <button type="button" onClick={() => focusCamera("sensors")} className="dash-segment-btn">
            Sensores
          </button>
        </div>
      </div>

      <div className="dash-panel__section">
        <p className="dash-panel__label text-xs uppercase tracking-wide">Capas visuales</p>
        <label className="dash-check-label mt-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={showSensorLabels}
            onChange={(e) => setShowSensorLabels(e.target.checked)}
          />
          Mostrar etiquetas de sensores
        </label>
        <label className="dash-check-label mt-2 flex items-center gap-2">
          <input type="checkbox" checked={showIsolines} onChange={(e) => setShowIsolines(e.target.checked)} />
          Mostrar isolíneas (cada 5 m)
        </label>
        <label className="dash-check-label mt-2 flex items-center gap-2">
          <input type="checkbox" checked={showSaturationMap} onChange={(e) => setShowSaturationMap(e.target.checked)} />
          Mostrar mapa de saturación
        </label>
        <label className="dash-check-label mt-2 flex items-center gap-2">
          <input type="checkbox" checked={showFlowVector} onChange={(e) => setShowFlowVector(e.target.checked)} />
          Mostrar vector de escorrentía
        </label>
      </div>

      <div className="dash-panel__section">
        <FSGauge value={metrics.safetyFactor} />
        <div className="dash-inset-box mt-3 space-y-1 rounded-md p-3 text-sm">
          <p>Nivel relave: {metrics.relaveLevel.toFixed(2)} msnm</p>
          <p className={metrics.freeboard < 1 ? "text-amber-600 dark:text-amber-300" : ""}>
            Borde libre: {metrics.freeboard.toFixed(2)} m
          </p>
          <p className={metrics.spillSeverity > 0.02 ? "text-rose-600 dark:text-rose-400" : ""}>
            Rebose: {metrics.spillM.toFixed(2)} m · severidad {(metrics.spillSeverity * 100).toFixed(0)}%
          </p>
          <p className={metrics.spillFlowM3s > 0.01 ? "text-rose-600 dark:text-rose-400" : ""}>
            Caudal vertedero: {metrics.spillFlowM3s.toFixed(2)} m³/s
          </p>
          <p>Caudal entrante: {metrics.inflowM3s.toFixed(2)} m³/s</p>
          <p>Intensidad lluvia: {metrics.rainIntensity.toFixed(1)} mm/h</p>
          <p>Presión piezométrica: {(metrics.piezometricPressure * 100).toFixed(0)}%</p>
          <p>Caudal filtración: {metrics.seepageFlow.toFixed(1)} L/min</p>
        </div>
        <p className="dash-panel__label mt-3 text-xs uppercase tracking-wide">Mapa de eventos simulados</p>
        <div className="dash-inset-box mt-2 space-y-1 rounded-md p-3 text-sm">
          {simulatedEvents.map((event) => (
            <p key={event}>- {event}</p>
          ))}
        </div>
      </div>
    </>
  );
}
