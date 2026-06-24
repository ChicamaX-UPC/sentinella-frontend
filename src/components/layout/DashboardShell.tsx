"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardTopBar } from "@/components/layout/DashboardTopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { WebSocketProvider } from "@/providers/WebSocketProvider";
import { useSessionStore } from "@/stores/useSessionStore";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const hydrate = useSessionStore((s) => s.hydrate);
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <WebSocketProvider>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <DashboardTopBar onMenuToggle={() => setDrawerOpen(true)} />
        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="hidden shrink-0 md:flex">
            <Sidebar />
          </div>

          {drawerOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                aria-label="Cerrar menú de navegación"
                onClick={() => setDrawerOpen(false)}
              />
              <div
                className="fixed inset-y-0 left-0 z-50 flex max-h-dvh overflow-y-auto overscroll-contain md:hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Menú de navegación"
              >
                <Sidebar />
              </div>
            </>
          ) : null}

          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-app/80 p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </WebSocketProvider>
  );
}
