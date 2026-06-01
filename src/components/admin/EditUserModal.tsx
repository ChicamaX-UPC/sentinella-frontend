"use client";

import { useEffect, useState } from "react";
import { PermissionList } from "@/components/profile/PermissionList";
import { ApiError, apiJson } from "@/lib/api/http";
import {
  defaultPermissionsForRole,
  effectivePermissions,
  type PermissionCode,
} from "@/lib/auth/permissions";
import { ROLE_LABEL_ES } from "@/lib/ui/labels";
import type { Role } from "@/types/session";

export type UserForEdit = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  permissions?: string[];
  jobTitle?: string | null;
  phone?: string | null;
};

type Props = {
  user: UserForEdit | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const ROLES: Role[] = ["SYSTEM_ADMIN", "PLANT_MANAGER", "FIELD_OPERATOR", "READ_ONLY"];

export function EditUserModal({ user, open, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("READ_ONLY");
  const [perms, setPerms] = useState<Set<PermissionCode>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !open) {
      return;
    }
    setFullName(user.fullName);
    setJobTitle(user.jobTitle ?? "");
    setPhone(user.phone ?? "");
    setRole(user.role);
    setPerms(new Set(effectivePermissions(user.permissions, user.role)));
    setError(null);
  }, [user, open]);

  if (!open || !user) {
    return null;
  }

  function togglePerm(code: PermissionCode) {
    setPerms((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  function restoreRoleDefaults() {
    setPerms(new Set(defaultPermissionsForRole(role)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = user;
    if (!target) {
      return;
    }
    if (perms.size === 0) {
      setError("Seleccione al menos un permiso");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiJson(`users/${target.id}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          jobTitle: jobTitle.trim() || null,
          phone: phone.trim() || null,
        }),
      });
      await apiJson(`users/${target.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      await apiJson(`users/${target.id}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: Array.from(perms) }),
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.body ?? `Error ${err.status}` : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "mt-1.5 w-full rounded-lg border border-white/12 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Cerrar" />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-elevated shadow-xl">
        <div className="shrink-0 border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Editar usuario</h2>
          <p className="mt-0.5 font-mono text-xs text-slate-500">{user.email}</p>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-none flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <label className="text-xs text-slate-500">Nombre completo</label>
              <input className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-500">Cargo</label>
                <input className={field} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={100} />
              </div>
              <div>
                <label className="text-xs text-slate-500">Teléfono</label>
                <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Rol base</label>
              <select className={field} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL_ES[r]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Permisos</p>
                <button
                  type="button"
                  onClick={restoreRoleDefaults}
                  className="text-[11px] text-slate-400 hover:text-accent"
                >
                  Restaurar según rol
                </button>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/15 p-2">
                <PermissionList
                  granted={Array.from(perms)}
                  editable
                  selected={perms}
                  onToggle={togglePerm}
                  disabled={busy}
                />
              </div>
            </div>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-white/10 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
