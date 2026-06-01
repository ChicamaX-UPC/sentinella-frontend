import { effectivePermissions } from "@/lib/auth/permissions";
import type { Role, SessionUser } from "@/types/session";

/** Mapea UserResource del API (login) al modelo de sesión del cliente. */
export function mapUserResourceToSession(raw: Record<string, unknown>): SessionUser {
  const role = raw.role as Role;
  const stored = Array.isArray(raw.permissions) ? (raw.permissions as unknown[]).map(String) : [];
  return {
    id: String(raw.id ?? ""),
    email: String(raw.email ?? ""),
    fullName: String(raw.fullName ?? ""),
    role,
    tailingDamIds: Array.isArray(raw.tailingDamIds) ? (raw.tailingDamIds as unknown[]).map(String) : [],
    active: Boolean(raw.active),
    permissions: effectivePermissions(stored, role),
    jobTitle: raw.jobTitle != null && raw.jobTitle !== "" ? String(raw.jobTitle) : null,
    phone: raw.phone != null && raw.phone !== "" ? String(raw.phone) : null,
  };
}
