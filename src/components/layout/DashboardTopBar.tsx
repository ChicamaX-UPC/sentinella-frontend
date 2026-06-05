"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionStore } from "@/stores/useSessionStore";

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

export function DashboardTopBar() {
  const user = useSessionStore((s) => s.user);
  const pathname = usePathname();
  const onProfile = pathname === "/profile" || pathname.startsWith("/profile/");
  const displayName = user?.fullName ?? user?.email ?? "Mi cuenta";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-white/10 bg-app/90 px-4 backdrop-blur-md sm:gap-6 sm:px-6">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-bold tracking-tight text-white">Sentinella</span>
        <span className="hidden text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:block">
          Sala de control — tranques de relaves
        </span>
      </div>

      <div className="ml-auto flex min-w-0 items-center">
        <Link
          href="/profile"
          title={user?.email ? `${displayName} · ${user.email}` : displayName}
          className={`inline-flex max-w-[min(100%,16rem)] items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors sm:max-w-[18rem] ${
            onProfile
              ? "border-accent/40 bg-accent/15 text-accent"
              : "border-white/12 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
          }`}
        >
          <UserIcon className="h-4 w-4 shrink-0 opacity-90" />
          <span className="truncate">{displayName}</span>
        </Link>
      </div>
    </header>
  );
}
