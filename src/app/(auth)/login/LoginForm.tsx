"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mapUserResourceToSession } from "@/lib/auth/map-user";
import { AUTH_FIELD_CLASS, AUTH_LINK_CLASS, AUTH_SUBMIT_CLASS } from "@/lib/auth/auth-ui";
import { useSessionStore } from "@/stores/useSessionStore";

function isSafeNextPath(v: string): v is `/${string}` {
  return v.startsWith("/") && !v.startsWith("//");
}

type LoginFormProps = {
  /** Ruta relativa de destino post-login; viene del `?next=` (resuelta en el servidor). */
  redirectAfterLogin: string;
};

export function LoginForm({ redirectAfterLogin }: LoginFormProps) {
  const router = useRouter();
  const setUser = useSessionStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "Credenciales invalidas");
        return;
      }
      const userRaw = data.user as Record<string, unknown> | undefined;
      if (!userRaw) {
        setError("Respuesta sin usuario");
        return;
      }
      setUser(mapUserResourceToSession(userRaw));
      router.replace(isSafeNextPath(redirectAfterLogin) ? redirectAfterLogin : "/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-slate-500">Accede con tu cuenta corporativa</p>
      <form className="mt-10 space-y-5" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500" htmlFor="email">
            Correo
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={AUTH_FIELD_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
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
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <div className="mt-8 flex flex-col gap-2 border-t border-border pt-7 text-left text-sm text-muted-foreground">
        <Link href="/forgot-password" className={AUTH_LINK_CLASS}>
          Olvidé mi contraseña
        </Link>
        <span>
          ¿No tienes cuenta?{" "}
          <Link href="/register" className={`${AUTH_LINK_CLASS} font-medium`}>
            Registrarse
          </Link>
        </span>
      </div>
    </div>
  );
}
