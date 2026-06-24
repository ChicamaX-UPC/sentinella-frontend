"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { mapUserResourceToSession } from "@/lib/auth/map-user";
import { planCodeFromQuery } from "@/lib/api/billing";
import { AUTH_FIELD_CLASS, AUTH_LINK_CLASS, AUTH_SUBMIT_CLASS } from "@/lib/auth/auth-ui";
import { useSessionStore } from "@/stores/useSessionStore";

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPlan = searchParams.get("plan");
  const setUser = useSessionStore((s) => s.setUser);
  const [companyName, setCompanyName] = useState("");
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
        body: JSON.stringify({ email, password, fullName, companyName }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "No se pudo registrar la empresa");
        return;
      }
      const userRaw = data.user as Record<string, unknown> | undefined;
      if (!userRaw) {
        setError("Respuesta sin usuario");
        return;
      }
      setUser(mapUserResourceToSession(userRaw));
      const planQuery = planCodeFromQuery(preselectedPlan) ? `&plan=${preselectedPlan}` : "";
      router.replace(`/profile?billing=1${planQuery}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Registrar empresa minera</h1>
      <p className="mt-2 text-sm text-slate-500">
        Cuenta corporativa para operar tranques de relaves. Tras el registro elegirá su plan y activará la
        suscripción mensual.
      </p>
      {preselectedPlan ? (
        <p className="mt-2 text-sm text-sky-400/90">
          Plan preseleccionado: <span className="font-medium capitalize">{preselectedPlan}</span>
        </p>
      ) : null}
      <form className="mt-10 space-y-5" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500" htmlFor="companyName">
            Empresa minera
          </label>
          <input
            id="companyName"
            type="text"
            autoComplete="organization"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Ej. Minera ChicamaX S.A."
            className={AUTH_FIELD_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500" htmlFor="fullName">
            Responsable de cuenta
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nombre del contacto principal"
            className={AUTH_FIELD_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500" htmlFor="reg-email">
            Correo corporativo
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
        <button type="submit" disabled={loading} className={AUTH_SUBMIT_CLASS}>
          {loading ? "Registrando empresa…" : "Registrar empresa"}
        </button>
      </form>
      <p className="mt-8 border-t border-border pt-7 text-left text-sm text-muted-foreground">
        ¿Ya tiene cuenta?{" "}
        <Link href="/login" className={`${AUTH_LINK_CLASS} font-medium`}>
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-white/5" />}>
      <RegisterFormContent />
    </Suspense>
  );
}
