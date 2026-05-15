"use client";

import { useEffect, useState } from "react";
import { CreateUserModal } from "@/components/admin/CreateUserModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError, apiFetch, apiJson } from "@/lib/api/http";
import { ROLE_LABEL_ES } from "@/lib/ui/labels";
import type { Role } from "@/types/session";

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  active?: boolean;
};

const ROLES: Role[] = ["SYSTEM_ADMIN", "PLANT_MANAGER", "FIELD_OPERATOR", "READ_ONLY"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  function load() {
    setError(null);
    apiJson<UserRow[]>("users")
      .then(setUsers)
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar usuarios");
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function updateRole(userId: string, role: Role) {
    setBusy(true);
    try {
      await apiJson(`users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      load();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.body ?? `Error ${err.status}` : "Error al actualizar rol");
    } finally {
      setBusy(false);
    }
  }

  async function removeUser(userId: string) {
    if (!confirm("¿Eliminar este usuario?")) {
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch(`users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const t = await res.text();
        throw new ApiError(`HTTP ${res.status}`, res.status, t);
      }
      load();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.body ?? `Error ${err.status}` : "Error al eliminar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Usuarios del sistema"
          description="Altas, cambio de rol y bajas. Solo administradores del sistema."
        />
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover"
        >
          Nuevo usuario
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-amber-400">{error}</p> : null}

      <div className="mt-8 hidden md:block overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-slate-200">{u.fullName}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    disabled={busy}
                    onChange={(e) => void updateRole(u.id, e.target.value as Role)}
                    className="rounded-lg border border-white/15 bg-app px-2 py-1.5 text-xs text-slate-200"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL_ES[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeUser(u.id)}
                    className="text-xs text-red-400 hover:underline disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-6 space-y-3 md:hidden">
        {users.map((u) => (
          <li key={u.id} className="rounded-xl border border-white/10 bg-surface-elevated/50 p-4">
            <p className="font-semibold text-slate-100">{u.fullName}</p>
            <p className="mt-1 font-mono text-xs text-slate-500">{u.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={u.role}
                disabled={busy}
                onChange={(e) => void updateRole(u.id, e.target.value as Role)}
                className="flex-1 rounded-lg border border-white/15 bg-app px-2 py-2 text-xs"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL_ES[r]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={() => void removeUser(u.id)}
                className="text-xs text-red-400 hover:underline"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>

      {users.length === 0 && !error ? (
        <p className="mt-8 text-center text-sm text-slate-500">No hay usuarios listados.</p>
      ) : null}

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          load();
        }}
      />
    </div>
  );
}
