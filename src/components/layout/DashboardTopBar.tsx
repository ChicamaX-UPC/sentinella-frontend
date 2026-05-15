"use client";

import { useSessionStore } from "@/stores/useSessionStore";

export function DashboardTopBar() {
  const user = useSessionStore((s) => s.user);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-white/10 bg-app/90 px-4 backdrop-blur-md sm:gap-6 sm:px-6">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-bold tracking-tight text-white">Sentinella</span>
        <span className="hidden text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:block">
          Sala de control — tranques de relaves
        </span>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2 text-xs text-slate-400">
        <span className="hidden max-w-[14rem] truncate sm:inline" title={user?.email ?? undefined}>
          {user?.fullName ?? user?.email ?? "—"}
        </span>
      </div>
    </header>
  );
}
