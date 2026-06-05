"use client";

import { useEffect } from "react";
import { DashboardTopBar } from "@/components/layout/DashboardTopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { WebSocketProvider } from "@/providers/WebSocketProvider";
import { useSessionStore } from "@/stores/useSessionStore";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const hydrate = useSessionStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <WebSocketProvider>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <DashboardTopBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar />
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-app/80 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </WebSocketProvider>
  );
}
