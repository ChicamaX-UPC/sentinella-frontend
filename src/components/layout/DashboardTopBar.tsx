"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
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

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
    </svg>
  );
}

export function DashboardTopBar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const user = useSessionStore((s) => s.user);
  const pathname = usePathname();
  const onProfile = pathname === "/profile" || pathname.startsWith("/profile/");
  const displayName = user?.fullName ?? user?.email ?? "Mi cuenta";

  return (
    <header className="dash-topbar sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 px-4 sm:gap-6 sm:px-6">
      {onMenuToggle ? (
        <button
          type="button"
          onClick={onMenuToggle}
          className="dash-profile-btn inline-flex shrink-0 items-center justify-center rounded-lg p-2 md:hidden"
          aria-label="Abrir menú de navegación"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      ) : null}
      <div className="flex min-w-0 flex-col">
        <span className="dash-topbar__brand text-sm font-bold tracking-tight">Sentinella</span>
        <span className="dash-topbar__subtitle hidden text-[10px] font-medium uppercase tracking-wider sm:block">
          Sala de control — tranques de relaves
        </span>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        <ThemeToggle className="theme-toggle-btn" />
        <Link
          href="/profile"
          title={user?.email ? `${displayName} · ${user.email}` : displayName}
          className={`dash-profile-btn inline-flex max-w-[min(100%,16rem)] items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:max-w-[18rem] ${
            onProfile ? "dash-profile-btn--active" : ""
          }`}
        >
          <UserIcon className="h-4 w-4 shrink-0 opacity-90" />
          <span className="truncate">{displayName}</span>
        </Link>
      </div>
    </header>
  );
}
