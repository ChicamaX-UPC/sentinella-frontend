"use client";

import { type ReactNode, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionList } from "@/components/profile/PermissionList";
import { mapUserResourceToSession } from "@/lib/auth/map-user";
import { effectivePermissions, type PermissionCode } from "@/lib/auth/permissions";
import { ApiError, apiJson } from "@/lib/api/http";
import { labelRole } from "@/lib/ui/labels";
import { useSessionStore } from "@/stores/useSessionStore";
import type { Role } from "@/types/session";

type ProfileUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  active?: boolean;
  tailingDamIds?: string[];
  lastLogin?: string | null;
  permissions?: string[];
  jobTitle?: string | null;
  phone?: string | null;
};

function parseApiError(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return "No se pudo completar la operación";
  }
  if (err.body) {
    try {
      const parsed = JSON.parse(err.body) as { message?: string };
      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      if (err.body.length < 200) {
        return err.body;
      }
    }
  }
  return `Error ${err.status}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function shortId(id: string): string {
  if (id.length <= 12) {
    return id;
  }
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function formatLastLogin(iso?: string | null): string {
  if (!iso) {
    return "Sin registro de acceso";
  }
  try {
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function ActiveStatus({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-slate-600"}`}
        aria-hidden
      />
      {active ? "Cuenta activa" : "Cuenta inactiva"}
    </span>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="min-w-0 pb-3 text-sm text-slate-300 last:pb-0">{children}</dd>
    </>
  );
}

export default function ProfilePage() {
  const sessionUser = useSessionStore((s) => s.user);
  const setUser = useSessionStore((s) => s.setUser);

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    apiJson<ProfileUser>("users/me")
      .then((u) => {
        setProfile(u);
        setFullName(u.fullName);
        setJobTitle(u.jobTitle ?? "");
        setPhone(u.phone ?? "");
      })
      .catch((e: unknown) => {
        if (sessionUser) {
          setProfile({
            id: sessionUser.id,
            email: sessionUser.email,
            fullName: sessionUser.fullName,
            role: sessionUser.role,
            active: sessionUser.active,
            tailingDamIds: sessionUser.tailingDamIds,
            permissions: sessionUser.permissions,
            jobTitle: sessionUser.jobTitle,
            phone: sessionUser.phone,
          });
          setFullName(sessionUser.fullName);
          setJobTitle(sessionUser.jobTitle ?? "");
          setPhone(sessionUser.phone ?? "");
        }
        setError(e instanceof ApiError ? parseApiError(e) : "No se pudo cargar el perfil");
      })
      .finally(() => setLoading(false));
  }, [sessionUser]);

  const role = profile?.role;
  const displayName = profile?.fullName || fullName || "Usuario";
  const isActive = profile?.active !== false;
  const grantedPerms: PermissionCode[] = profile
    ? effectivePermissions(profile.permissions, profile.role)
    : [];
  const dams = profile?.tailingDamIds ?? [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError("La nueva contraseña y la confirmación no coinciden");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string | null> = {
        fullName: fullName.trim(),
        jobTitle: jobTitle.trim() || null,
        phone: phone.trim() || null,
      };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const updated = await apiJson<Record<string, unknown>>("users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const mapped = mapUserResourceToSession(updated);
      setUser(mapped);
      setProfile({
        id: mapped.id,
        email: mapped.email,
        fullName: mapped.fullName,
        role: mapped.role,
        active: mapped.active,
        tailingDamIds: mapped.tailingDamIds,
        permissions: mapped.permissions,
        jobTitle: mapped.jobTitle,
        phone: mapped.phone,
        lastLogin: typeof updated.lastLogin === "string" ? updated.lastLogin : profile?.lastLogin,
      });
      setSuccess("Cambios guardados correctamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  const field =
    "mt-1.5 w-full rounded-xl border border-white/12 bg-black/20 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-accent/45 focus:ring-1 focus:ring-accent/20";
  const readOnly =
    "mt-1.5 rounded-xl border border-white/8 bg-black/15 px-3.5 py-2.5 text-sm text-slate-400";

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse space-y-6">
        <div className="h-14 rounded-lg bg-white/5" />
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="h-72 rounded-2xl bg-white/5" />
          <div className="h-96 rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Cuenta" title="Mi perfil" />

      {error && !profile ? (
        <p className="mb-6 rounded-xl border border-red-900/40 bg-red-950/25 px-4 py-3 text-sm text-red-300">{error}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside className="lg:sticky lg:top-4">
          <section className="rounded-2xl border border-white/10 bg-surface-elevated/60 p-5">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xl font-semibold text-accent"
              aria-hidden
            >
              {initials(displayName)}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-100">{displayName}</h2>
            <p className="mt-1 break-all text-sm text-slate-400">{profile?.email ?? "—"}</p>
            {role ? <p className="mt-2 text-sm text-slate-400">{labelRole(role)}</p> : null}
            <p className="mt-2">
              <ActiveStatus active={isActive} />
            </p>

            <dl className="mt-6 grid grid-cols-1 gap-x-3 border-t border-white/8 pt-5 sm:grid-cols-[auto_1fr]">
              <InfoRow label="Sitio">Chicama Norte</InfoRow>
              <InfoRow label="Último acceso">{formatLastLogin(profile?.lastLogin)}</InfoRow>
              <InfoRow label="ID">
                <span className="font-mono text-xs" title={profile?.id}>
                  {profile?.id ? shortId(profile.id) : "—"}
                </span>
              </InfoRow>
              <InfoRow label="Tranques">{dams.length}</InfoRow>
            </dl>

            {dams.length > 0 ? (
              <ul className="mt-3 space-y-1 border-t border-white/8 pt-3">
                {dams.map((id) => (
                  <li key={id} className="truncate font-mono text-[11px] text-slate-500" title={id}>
                    {shortId(id)}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="mt-4 rounded-2xl border border-white/10 bg-surface-elevated/50 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Permisos asignados</h3>
            <p className="mt-1 text-[11px] text-slate-600">Según su rol y ajustes del administrador.</p>
            <div className="mt-3">
              {grantedPerms.length > 0 ? (
                <PermissionList granted={grantedPerms} />
              ) : (
                <p className="text-sm text-slate-500">Sin permisos registrados.</p>
              )}
            </div>
          </section>
        </aside>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
          {(error && profile) || success ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                success
                  ? "border-emerald-800/40 bg-emerald-950/30 text-emerald-200"
                  : "border-red-900/40 bg-red-950/25 text-red-300"
              }`}
            >
              {success ?? error}
            </div>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-surface-elevated/55 p-5 sm:p-6">
            <h3 className="text-base font-semibold text-slate-100">Datos personales</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="fullName" className="text-xs text-slate-500">
                  Nombre completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  maxLength={150}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={field}
                  autoComplete="name"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="jobTitle" className="text-xs text-slate-500">
                    Cargo / puesto
                  </label>
                  <input
                    id="jobTitle"
                    type="text"
                    maxLength={100}
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className={field}
                    placeholder="Ej. Jefe de planta relaves"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="text-xs text-slate-500">
                    Teléfono de contacto
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    maxLength={30}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={field}
                    placeholder="+51 999 999 999"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">Correo electrónico</p>
                <p className={readOnly}>{profile?.email ?? "—"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-surface-elevated/55 p-5 sm:p-6">
            <h3 className="text-base font-semibold text-slate-100">Seguridad</h3>
            <p className="mt-1 text-xs text-slate-500">Opcional. Mínimo 8 caracteres.</p>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="currentPassword" className="text-xs text-slate-500">
                  Contraseña actual
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={field}
                  autoComplete="current-password"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="newPassword" className="text-xs text-slate-500">
                    Nueva contraseña
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={field}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="text-xs text-slate-500">
                    Confirmar
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={field}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-[#1a0f08] hover:bg-accent-hover disabled:opacity-55"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
