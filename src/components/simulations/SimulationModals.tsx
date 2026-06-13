"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useTailingDamOptions } from "@/hooks/useTailingDamOptions";
import { ApiError, apiJson } from "@/lib/api/http";
import {
  SIMULATION_TYPES,
  labelSimulationType,
  type SimulationTypeCode,
} from "@/lib/ui/labels";
import { useSessionStore } from "@/stores/useSessionStore";

type Scenario = {
  id: string;
  name: string;
  description?: string | null;
  simulationType: string;
  parameters: Record<string, unknown>;
  tailingDamId: string;
};

type NewProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export function NewSimulationModal({ open, onClose, onCreated }: NewProps) {
  const user = useSessionStore((s) => s.user);
  const { options: tailingDamOptions } = useTailingDamOptions(open);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [simulationType, setSimulationType] = useState<SimulationTypeCode>("WATER_LEVEL_RISE");
  const [tailingDamId, setTailingDamId] = useState("");
  const [parametersJson, setParametersJson] = useState('{"deltaMeters": 0.5}');

  useEffect(() => {
    if (user?.tailingDamIds?.length && !tailingDamId && open) {
      setTailingDamId(user.tailingDamIds[0]);
    }
  }, [user, tailingDamId, open]);

  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let parameters: unknown;
      try {
        parameters = JSON.parse(parametersJson) as unknown;
      } catch {
        setError("El JSON de parámetros no es válido");
        setBusy(false);
        return;
      }
      await apiJson<{ id: string }>("simulation-scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          simulationType,
          parameters,
          tailingDamId: tailingDamId.trim(),
        }),
      });
      setName("");
      setDescription("");
      setParametersJson('{"deltaMeters": 0.5}');
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.body ?? `Error ${err.status}` : "Error al crear");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo escenario" panelClassName="max-w-xl">
      {error ? <p className="mb-3 text-sm text-amber-400">{error}</p> : null}
      <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-3 text-sm">
        <div>
          <label className="text-xs text-slate-500">Nombre</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Tipo de escenario</label>
          <select
            value={simulationType}
            onChange={(e) => setSimulationType(e.target.value as SimulationTypeCode)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
          >
            {SIMULATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {labelSimulationType(t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Tranque</label>
          {tailingDamOptions.length > 0 ? (
            <select
              required
              value={tailingDamId}
              onChange={(e) => setTailingDamId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
            >
              <option value="">Seleccionar tranque…</option>
              {tailingDamOptions.map((dam) => (
                <option key={dam.id} value={dam.id}>
                  {dam.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              required
              value={tailingDamId}
              onChange={(e) => setTailingDamId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
            />
          )}
        </div>
        <div>
          <label className="text-xs text-slate-500">Parámetros (JSON)</label>
          <textarea
            value={parametersJson}
            onChange={(e) => setParametersJson(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 font-mono text-xs text-slate-100"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "Creando…" : "Crear escenario"}
        </button>
      </form>
    </Modal>
  );
}

type EditProps = {
  open: boolean;
  scenarioId: string | null;
  onClose: () => void;
  onSaved?: () => void;
};

export function EditSimulationModal({ open, scenarioId, onClose, onSaved }: EditProps) {
  const [row, setRow] = useState<Scenario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [simulationType, setSimulationType] = useState<SimulationTypeCode>("WATER_LEVEL_RISE");
  const [parametersJson, setParametersJson] = useState("{}");

  useEffect(() => {
    if (!open || !scenarioId) {
      setRow(null);
      setError(null);
      return;
    }
    setError(null);
    apiJson<Scenario>(`simulation-scenarios/${scenarioId}`)
      .then((s) => {
        setRow(s);
        setName(s.name);
        setDescription(s.description ?? "");
        setSimulationType(s.simulationType as SimulationTypeCode);
        setParametersJson(JSON.stringify(s.parameters ?? {}, null, 2));
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
      });
  }, [open, scenarioId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!scenarioId) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let parameters: unknown;
      try {
        parameters = JSON.parse(parametersJson) as unknown;
      } catch {
        setError("El JSON de parámetros no es válido");
        setBusy(false);
        return;
      }
      const updated = await apiJson<Scenario>(`simulation-scenarios/${scenarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          simulationType,
          parameters,
        }),
      });
      setRow(updated);
      onSaved?.();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.body ?? `Error ${err.status}` : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  const title = row?.name ?? "Editar escenario";

  return (
    <Modal open={open} onClose={onClose} title={title} panelClassName="max-w-xl">
      {error ? <p className="mb-3 text-sm text-amber-400">{error}</p> : null}
      {row ? (
        <form onSubmit={(ev) => void save(ev)} className="space-y-3 text-sm">
          <div>
            <label className="text-xs text-slate-500">Nombre</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Tipo de escenario</label>
            <select
              value={simulationType}
              onChange={(e) => setSimulationType(e.target.value as SimulationTypeCode)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
            >
              {SIMULATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {labelSimulationType(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Parámetros (JSON)</label>
            <textarea
              value={parametersJson}
              onChange={(e) => setParametersJson(e.target.value)}
              rows={8}
              className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 font-mono text-xs text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      ) : !error && open && scenarioId ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : null}
    </Modal>
  );
}
