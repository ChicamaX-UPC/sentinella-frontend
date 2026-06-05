"use client";

import { useEffect, useMemo, useState } from "react";
import { CreateUserModal } from "@/components/admin/CreateUserModal";
import { EditUserModal, type UserForEdit } from "@/components/admin/EditUserModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError, apiFetch, apiJson } from "@/lib/api/http";
import { labelRole } from "@/lib/ui/labels";
import { useSessionStore } from "@/stores/useSessionStore";
import type { Role } from "@/types/session";

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  active?: boolean;
  permissions?: string[];
  jobTitle?: string | null;
  phone?: string | null;
};

export default function AdminUsersPage() {
  const sessionUser = useSessionStore((s) => s.user);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserForEdit | null>(null);

  const visibleUsers = useMemo(
    () => users.filter((u) => u.id !== sessionUser?.id),
    [users, sessionUser?.id]
  );

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
        <PageHeader eyebrow="Administración" title="Usuarios del sistema" />
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover"
        >
          Nuevo usuario
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Tu perfil se gestiona desde la barra superior. Aquí solo aparecen el resto de cuentas.
      </p>

      {error ? <p className="mt-4 text-sm text-amber-400">{error}</p> : null}

      <div className="mt-8 hidden md:block overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((u) => (
              <tr key={u.id} className="border-b border-white/5 bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-200">{u.fullName}</p>
                  {u.jobTitle ? <p className="text-xs text-slate-500">{u.jobTitle}</p> : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{u.email}</td>
                <td className="px-4 py-3 text-slate-400">{labelRole(u.role)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setEditUser(u)}
                    className="mr-3 text-xs font-medium text-accent hover:underline disabled:opacity-50"
                  >
                    Editar
                  </button>
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
        {visibleUsers.map((u) => (
          <li key={u.id} className="rounded-xl border border-white/10 bg-surface-elevated/50 p-4">
            <p className="font-semibold text-slate-100">{u.fullName}</p>
            <p className="mt-1 font-mono text-xs text-slate-500">{u.email}</p>
            <p className="mt-1 text-xs text-slate-400">{labelRole(u.role)}</p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditUser(u)}
                className="text-xs font-medium text-accent hover:underline"
              >
                Editar
              </button>
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

      {visibleUsers.length === 0 && !error ? (
        <p className="mt-8 text-center text-sm text-slate-500">No hay otros usuarios en el sistema.</p>
      ) : null}

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          load();
        }}
      />

      <EditUserModal
        user={editUser}
        open={Boolean(editUser)}
        onClose={() => setEditUser(null)}
        onSaved={load}
      />
    </div>
  );
}
