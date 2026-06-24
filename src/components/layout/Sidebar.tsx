"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSessionStore } from "@/stores/useSessionStore";
import type { Role } from "@/types/session";

type NavItem = { href: string; label: string };

type NavSection = {
  id: string;
  items: NavItem[];
  simulationsOnly?: boolean;
};

const sections: NavSection[] = [
  {
    id: "main",
    items: [
      { href: "/dashboard", label: "Inicio" },
      { href: "/monitoring", label: "Monitoreo" },
    ],
  },
  {
    id: "alerts",
    items: [
      { href: "/alerts", label: "Alertas" },
      { href: "/alerts/rules", label: "Umbrales" },
    ],
  },
  {
    id: "ops",
    items: [
      { href: "/inspections", label: "Inspecciones" },
      { href: "/reports", label: "Reportes" },
      { href: "/digital-twin", label: "Gemelo digital" },
    ],
  },
  {
    id: "analysis",
    simulationsOnly: true,
    items: [{ href: "/simulations", label: "Simulaciones" }],
  },
];

const adminSection: NavSection = {
  id: "admin",
  items: [{ href: "/admin/users", label: "Usuarios" }],
};

function canSeeSimulations(role: Role | undefined) {
  return role === "PLANT_MANAGER" || role === "SYSTEM_ADMIN";
}

function canSeeAdmin(role: Role | undefined, permissions: string[]) {
  if (role === "SYSTEM_ADMIN") {
    return true;
  }
  return role === "PLANT_MANAGER" && permissions.includes("MANAGE_USERS");
}

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

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isSidebarNavActive(item.href, pathname);
  return (
    <Link
      href={item.href}
      className={`nav-sidebar-link block rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? "nav-sidebar-link--active font-medium shadow-sm" : ""
      }`}
    >
      {item.label}
    </Link>
  );
}

function NavSectionBlock({
  section,
  pathname,
  showDividerAbove,
}: {
  section: NavSection;
  pathname: string;
  showDividerAbove: boolean;
}) {
  return (
    <div className={showDividerAbove ? "pt-1" : ""}>
      {showDividerAbove ? <hr className="mb-2 border-0 border-t border-border" /> : null}
      <ul className="space-y-0.5">
        {section.items.map((item) => (
          <li key={item.href}>
            <NavLink item={item} pathname={pathname} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);

  const visibleSections = sections.filter((section) => {
    if (section.simulationsOnly) {
      return canSeeSimulations(user?.role);
    }
    return true;
  });

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    useSessionStore.getState().clear();
    router.replace("/login");
  }

  return (
    <div className="flex h-full shrink-0 items-stretch py-3 pl-3 pr-1 sm:py-4 sm:pl-4">
      <aside
        className="dashboard-sidebar flex w-[14.5rem] min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-border bg-card shadow-lg backdrop-blur-xl sm:w-[15.5rem]"
        aria-label="Navegación principal"
      >
        <div className="shrink-0 px-4 pb-3 pt-4">
          <p className="text-xs font-semibold text-foreground">Chicama Norte</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Sala de control</p>
        </div>

        <hr className="mx-3 border-0 border-t border-border" />

        <nav className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 py-2">
          {visibleSections.map((section, index) => (
            <NavSectionBlock
              key={section.id}
              section={section}
              pathname={pathname}
              showDividerAbove={index > 0}
            />
          ))}

          {canSeeAdmin(user?.role, user?.permissions ?? []) ? (
            <div className="pt-1">
              <hr className="mb-2 border-0 border-t border-border" />
              <ul className="space-y-0.5">
                {adminSection.items.map((item) => {
                  const active = isSidebarNavActive(item.href, pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`nav-sidebar-link nav-sidebar-link--admin block rounded-lg px-3 py-2 text-sm transition-colors ${
                          active ? "nav-sidebar-link--admin-active font-medium" : ""
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </nav>

        <hr className="mx-3 border-0 border-t border-border" />

        <div className="shrink-0 p-2">
          <button
            type="button"
            onClick={() => void logout()}
            className="nav-sidebar-logout flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
          >
            <LogOutIcon className="h-4 w-4 shrink-0 opacity-90" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
