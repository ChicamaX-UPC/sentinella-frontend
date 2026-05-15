"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSessionStore } from "@/stores/useSessionStore";
import type { Role } from "@/types/session";

const nav = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/monitoring", label: "Monitoreo" },
  { href: "/alerts", label: "Alertas" },
  { href: "/alerts/rules", label: "Umbrales" },
  { href: "/inspections", label: "Inspecciones" },
  { href: "/reports", label: "Reportes" },
  { href: "/digital-twin", label: "Gemelo digital" },
  { href: "/simulations", label: "Simulaciones" },
] as const;

const adminNav = [{ href: "/admin/users", label: "Usuarios" }] as const;

function canSeeSimulations(role: Role | undefined) {
  return role === "PLANT_MANAGER" || role === "SYSTEM_ADMIN";
}

function canSeeAdmin(role: Role | undefined) {
  return role === "SYSTEM_ADMIN";
}

/** Evita que /alerts/rules active también el ítem «Alertas» (/alerts). */
function isSidebarNavActive(href: string, pathname: string): boolean {
  if (href === "/alerts/rules") {
    return pathname === "/alerts/rules" || pathname.startsWith("/alerts/rules/");
  }
  if (href === "/alerts") {
    if (pathname.startsWith("/alerts/rules")) {
      return false;
    }
    return pathname === "/alerts" || pathname.startsWith("/alerts/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 9l3 3m0 0l-3 3m3-3H9"
      />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    useSessionStore.getState().clear();
    router.replace("/login");
  }

  return (
    <aside className="flex h-full min-h-0 w-[15.5rem] shrink-0 flex-col border-r border-white/10 bg-surface-elevated/95 text-sm text-slate-200 sm:w-60">
      <div className="shrink-0 border-b border-white/10 px-4 py-4">
        <p className="text-[11px] leading-snug text-slate-300">
          Tranque Chicama Norte
          <span className="mt-1 block font-normal text-slate-500">Vista web — jefe de planta / sala</span>
        </p>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-2">
        {nav
          .filter((item) => (item.href.startsWith("/simulations") ? canSeeSimulations(user?.role) : true))
          .map((item) => {
            const active = isSidebarNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 transition-colors ${
                  active ? "bg-accent/20 text-white" : "hover:bg-slate-800/80"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        {canSeeAdmin(user?.role) &&
          adminNav.map((item) => {
            const active = isSidebarNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 transition-colors ${
                  active ? "bg-accent-blue/15 text-white ring-1 ring-accent-blue/25" : "hover:bg-slate-800/80"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-2">
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-red-300 hover:bg-red-950/40"
        >
          <LogOutIcon className="h-4 w-4 shrink-0 opacity-90" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
