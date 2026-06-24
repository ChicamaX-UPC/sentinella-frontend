"use client";

import { useEffect, useState } from "react";
import { ApiError, apiJson } from "@/lib/api/http";
import { adaptApiScenario, ApiSimulationScenario, scenarioIsPublic } from "@/lib/digitalTwin/scenarioAdapter";
import { useSimulationStore } from "@/stores/useSimulationStore";

type Props = {
  disabled?: boolean;
};

export function ScenarioLoader({ disabled }: Props) {
  const [scenarios, setScenarios] = useState<ApiSimulationScenario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const loadApiScenario = useSimulationStore((s) => s.loadApiScenario);
  const mode = useSimulationStore((s) => s.mode);

  useEffect(() => {
    apiJson<ApiSimulationScenario[]>("simulation-scenarios")
      .then((list) => setScenarios(list.filter(scenarioIsPublic)))
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "No se pudieron cargar escenarios");
      });
  }, []);

  function applyScenario(id: string) {
    setSelectedId(id);
    const scenario = scenarios.find((s) => s.id === id);
    if (!scenario) return;
    if (mode === "REAL") {
      useSimulationStore.getState().setMode("SIMULATION");
    }
    loadApiScenario(scenario, true);
  }

  return (
    <div className="dash-panel__section">
      <p className="dash-panel__label text-xs uppercase tracking-wide">Escenario guardado (API)</p>
      {error ? <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{error}</p> : null}
      <select
        value={selectedId}
        disabled={disabled || scenarios.length === 0}
        onChange={(e) => applyScenario(e.target.value)}
        className="dash-field mt-2 w-full rounded-md px-2 py-2 text-sm disabled:opacity-50"
      >
        <option value="">{scenarios.length ? "Seleccionar escenario publicado…" : "Sin escenarios publicados"}</option>
        {scenarios.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({adaptApiScenario(s).simulationType})
          </option>
        ))}
      </select>
      <p className="dash-panel__text-muted mt-1 text-xs">
        Solo escenarios publicados. Cambia a modo Simulación automáticamente.
      </p>
    </div>
  );
}
