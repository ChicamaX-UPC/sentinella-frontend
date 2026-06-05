"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ApiError, apiJson } from "@/lib/api/http";
import { SENSOR_TYPES, labelSensorType, type SensorTypeCode } from "@/lib/ui/labels";
import { useSessionStore } from "@/stores/useSessionStore";

type Props = {
  open: boolean;
  onClose: () => void;
  onRegistered?: () => void;
};

export function RegisterNodeModal({ open, onClose, onRegistered }: Props) {
  const user = useSessionStore((s) => s.user);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    externalId: "",
    name: "",
    tailingDamId: "",
    sensorType: "WATER_LEVEL" as SensorTypeCode,
    latitude: "",
    longitude: "",
    position3d: "",
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    const dam = user?.tailingDamIds?.[0];
    if (dam) {
      setForm((f) => (f.tailingDamId ? f : { ...f, tailingDamId: dam }));
    }
  }, [open, user?.tailingDamIds]);

  useEffect(() => {
    if (!open) {
      setMessage(null);
      setError(null);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (user?.role !== "SYSTEM_ADMIN") {
      setError("Solo administradores pueden registrar nodos.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        externalId: form.externalId.trim(),
        name: form.name.trim(),
        tailingDamId: form.tailingDamId.trim(),
        sensorType: form.sensorType,
      };
      if (form.latitude) {
        body.latitude = Number(form.latitude);
      }
      if (form.longitude) {
        body.longitude = Number(form.longitude);
      }
      if (form.position3d.trim()) {
        body.position3d = form.position3d.trim();
      }
      await apiJson("nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setMessage("Nodo registrado correctamente.");
      setForm((f) => ({
        ...f,
        externalId: "",
        name: "",
        latitude: "",
        longitude: "",
        position3d: "",
      }));
      onRegistered?.();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.body ?? `Error ${err.status}` : "Error al registrar");
    } finally {
      setBusy(false);
    }
  }

  const canUse = user?.role === "SYSTEM_ADMIN";

  return (
    <Modal open={open} onClose={onClose} title="Registrar nodo IoT" panelClassName="max-w-lg">
      {!canUse ? (
        <p className="text-sm text-amber-400">Tu perfil no permite registrar nodos.</p>
      ) : (
        <>
          {error ? <p className="mb-2 text-sm text-red-400">{error}</p> : null}
          {message ? <p className="mb-2 text-sm text-emerald-400">{message}</p> : null}
          <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-3 text-sm">
            <div>
              <label className="text-xs text-slate-500">Identificador externo</label>
              <input
                required
                value={form.externalId}
                onChange={(e) => setForm((f) => ({ ...f, externalId: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Nombre</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Tranque (UUID)</label>
              <input
                required
                value={form.tailingDamId}
                onChange={(e) => setForm((f) => ({ ...f, tailingDamId: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Tipo de sensor</label>
              <select
                required
                value={form.sensorType}
                onChange={(e) => setForm((f) => ({ ...f, sensorType: e.target.value as SensorTypeCode }))}
                className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
              >
                {SENSOR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {labelSensorType(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500">Latitud</label>
                <input
                  value={form.latitude}
                  onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Longitud</label>
                <input
                  value={form.longitude}
                  onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Posición 3D (opcional)</label>
              <input
                value={form.position3d}
                onChange={(e) => setForm((f) => ({ ...f, position3d: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? "Registrando…" : "Registrar nodo"}
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
