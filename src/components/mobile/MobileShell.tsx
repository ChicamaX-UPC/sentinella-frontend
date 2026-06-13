"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { countMobilePendingTotal } from "@/lib/mobile/pendingCounts";
import { flushMutationOutbox } from "@/lib/mobile/outbox";

export function MobileShell({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  async function refreshPending() {
    try {
      setPending(await countMobilePendingTotal());
    } catch {
      setPending(0);
    }
  }

  useEffect(() => {
    void refreshPending();
    const up = () => setOnline(navigator.onLine);
    const vis = () => void refreshPending();
    window.addEventListener("online", up);
    window.addEventListener("offline", up);
    document.addEventListener("visibilitychange", vis);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", up);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  useEffect(() => {
    if (!online) {
      return;
    }
    void (async () => {
      await flushMutationOutbox();
      await refreshPending();
    })();
  }, [online]);

  return (
    <div className="min-h-screen bg-app text-foreground">
      <ServiceWorkerRegister />
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-app/95 px-4 py-3 backdrop-blur-md">
        <Link href="/mobile" className="text-sm font-semibold text-accent">
          Sentinella
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle className="theme-toggle-btn h-9 w-9" iconClassName="h-4 w-4" />
          <div className="flex flex-col items-end gap-0.5 text-xs">
          <span className={online ? "text-emerald-400" : "text-amber-400"}>
            {online ? "🟢 En línea" : "🟡 Offline"}
          </span>
          {pending > 0 ? (
            <span className="text-amber-300">
              {pending} pendiente{pending === 1 ? "" : "s"} (sync / fotos)
            </span>
          ) : null}
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-300">
            Escritorio
          </Link>
          </div>
        </div>
      </header>
      <div className="p-4">{children}</div>
    </div>
  );
}
