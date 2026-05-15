"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "No se pudo enviar la solicitud");
        return;
      }
      setMessage(data.message ?? "Si el correo existe, recibirás instrucciones.");
    } finally {
      setLoading(false);
    }
  }

  const field =
    "mt-2 w-full rounded-lg border border-white/15 bg-auth-bg px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent/50 focus:bg-auth-bg focus:ring-1 focus:ring-accent/25";

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Recuperar contraseña</h1>
      <p className="mt-2 text-sm text-slate-500">Te enviaremos un enlace si el correo está registrado.</p>
      <form className="mt-10 space-y-5" onSubmit={(ev) => void onSubmit(ev)}>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500" htmlFor="fp-email">
            Correo
          </label>
          <input
            id="fp-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
        </div>
        {error ? <p className="text-sm text-red-400/95">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-400/95">{message}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>
      <p className="mt-8 border-t border-white/10 pt-7 text-left text-sm text-slate-500">
        <Link href="/login" className="text-accent/95 hover:text-accent-hover hover:underline">
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
