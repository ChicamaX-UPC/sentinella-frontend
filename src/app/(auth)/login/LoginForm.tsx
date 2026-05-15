"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mapUserResourceToSession } from "@/lib/auth/map-user";
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

  const field =
    "mt-2 w-full rounded-lg border border-white/15 bg-auth-bg px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-accent/50 focus:bg-auth-bg focus:ring-1 focus:ring-accent/25";

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Iniciar sesión</h1>
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
            className={field}
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
            className={field}
          />
        </div>
        {error ? <p className="text-sm text-red-400/95">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-7 text-left text-sm text-slate-500">
        <Link href="/forgot-password" className="text-accent/95 hover:text-accent-hover hover:underline">
          Olvidé mi contraseña
        </Link>
        <span>
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-medium text-accent/95 hover:text-accent-hover hover:underline">
            Registrarse
          </Link>
        </span>
      </div>
    </div>
  );
}
