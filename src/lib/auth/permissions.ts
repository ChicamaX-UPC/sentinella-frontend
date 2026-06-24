import type { Role } from "@/types/session";

export type PermissionCode =
  | "VIEW_READINGS"
  | "CONFIGURE_THRESHOLDS"
  | "MANAGE_ALERTS"
  | "CLOSE_ALERTS"
  | "REGISTER_ROUNDS"
  | "GENERATE_REPORTS"
  | "REGISTER_IOT_NODES"
  | "MANAGE_USERS"
  | "MANAGE_SIMULATIONS"
  | "VIEW_SIMULATIONS"
  | "RUN_SIMULATIONS";

export const ALL_PERMISSIONS: { code: PermissionCode; label: string }[] = [
  { code: "VIEW_READINGS", label: "Ver lecturas en tiempo real" },
  { code: "CONFIGURE_THRESHOLDS", label: "Configurar umbrales" },
  { code: "MANAGE_ALERTS", label: "Crear y gestionar alertas" },
  { code: "CLOSE_ALERTS", label: "Cerrar alertas" },
  { code: "REGISTER_ROUNDS", label: "Registrar rondas de inspección" },
  { code: "GENERATE_REPORTS", label: "Generar reportes" },
  { code: "REGISTER_IOT_NODES", label: "Registrar nodos IoT" },
  { code: "MANAGE_USERS", label: "Gestionar usuarios" },
  { code: "MANAGE_SIMULATIONS", label: "Crear y editar simulaciones" },
  { code: "VIEW_SIMULATIONS", label: "Ver simulaciones del equipo" },
  { code: "RUN_SIMULATIONS", label: "Ejecutar simulaciones" },
];

const ROLE_DEFAULTS: Record<Role, PermissionCode[]> = {
  SYSTEM_ADMIN: ALL_PERMISSIONS.map((p) => p.code),
  PLANT_MANAGER: [
    "VIEW_READINGS",
    "CONFIGURE_THRESHOLDS",
    "MANAGE_ALERTS",
    "CLOSE_ALERTS",
    "REGISTER_ROUNDS",
    "GENERATE_REPORTS",
    "MANAGE_USERS",
    "MANAGE_SIMULATIONS",
    "VIEW_SIMULATIONS",
    "RUN_SIMULATIONS",
  ],
  FIELD_OPERATOR: ["VIEW_READINGS", "MANAGE_ALERTS", "REGISTER_ROUNDS"],
  READ_ONLY: ["VIEW_READINGS", "GENERATE_REPORTS", "VIEW_SIMULATIONS"],
};

export function defaultPermissionsForRole(role: Role): PermissionCode[] {
  return [...ROLE_DEFAULTS[role]];
}

export function effectivePermissions(stored: string[] | undefined, role: Role): PermissionCode[] {
  if (stored && stored.length > 0) {
    return stored.filter((p): p is PermissionCode => ALL_PERMISSIONS.some((x) => x.code === p));
  }
  return defaultPermissionsForRole(role);
}

export function labelPermission(code: string): string {
  return ALL_PERMISSIONS.find((p) => p.code === code)?.label ?? code;
}
