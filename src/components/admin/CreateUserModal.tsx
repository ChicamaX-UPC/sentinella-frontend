"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ApiError, apiJson } from "@/lib/api/http";
import { ROLE_LABEL_ES } from "@/lib/ui/labels";
import type { Role } from "@/types/session";

const ROLES: Role[] = ["SYSTEM_ADMIN", "PLANT_MANAGER", "FIELD_OPERATOR", "READ_ONLY"];

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export function CreateUserModal({ open, onClose, onCreated }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "READ_ONLY" as Role,
    tailingDamIds: "",
  });

  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const dams = form.tailingDamIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await apiJson("users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          role: form.role,
          tailingDamIds: dams.length ? dams : [],
        }),
      });
      setForm({ email: "", password: "", fullName: "", role: "READ_ONLY", tailingDamIds: "" });
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.body ?? `Error ${err.status}` : "Error al crear");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo usuario" panelClassName="max-w-lg">
      {error ? <p className="mb-3 text-sm text-amber-400">{error}</p> : null}
      <form onSubmit={(ev) => void createUser(ev)} className="space-y-3 text-sm">
        <div>
          <label className="text-xs text-slate-500">Correo electrónico</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Contraseña</label>
          <input
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Nombre completo</label>
          <input
            required
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Rol</label>
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
            className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL_ES[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Tranques (UUID separados por coma)</label>
          <input
            value={form.tailingDamIds}
            onChange={(e) => setForm((f) => ({ ...f, tailingDamIds: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-white/15 bg-app px-3 py-2 text-slate-100"
            placeholder="Opcional"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "Creando…" : "Crear usuario"}
        </button>
      </form>
    </Modal>
  );
}
