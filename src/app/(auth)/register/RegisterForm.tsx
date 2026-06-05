"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mapUserResourceToSession } from "@/lib/auth/map-user";
import { AUTH_FIELD_CLASS, AUTH_LINK_CLASS, AUTH_SUBMIT_CLASS } from "@/lib/auth/auth-ui";
import { useSessionStore } from "@/stores/useSessionStore";

export function RegisterForm() {
  const router = useRouter();
  const setUser = useSessionStore((s) => s.setUser);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, fullName }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "No se pudo registrar");
        return;
      }
      const userRaw = data.user as Record<string, unknown> | undefined;
      if (!userRaw) {
        setError("Respuesta sin usuario");
        return;
      }
      setUser(mapUserResourceToSession(userRaw));
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Crear cuenta</h1>
      <p className="mt-2 text-sm text-slate-500">
        Rol inicial <span className="text-slate-400">solo lectura</span>. Un administrador puede ampliar permisos.
      </p>
      <form className="mt-10 space-y-5" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500" htmlFor="fullName">
            Nombre completo
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={AUTH_FIELD_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500" htmlFor="reg-email">
            Correo
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={AUTH_FIELD_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500" htmlFor="reg-password">
            Contraseña
          </label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={AUTH_FIELD_CLASS}
          />
        </div>
        {error ? <p className="text-sm text-red-400/95">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className={AUTH_SUBMIT_CLASS}
        >
          {loading ? "Creando cuenta…" : "Registrarse"}
        </button>
      </form>
      <p className="mt-8 border-t border-white/10 pt-7 text-left text-sm text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className={`${AUTH_LINK_CLASS} font-medium`}>
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
