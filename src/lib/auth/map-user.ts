import type { Role, SessionUser } from "@/types/session";

/** Mapea UserResource del API (login) al modelo de sesión del cliente. */
export function mapUserResourceToSession(raw: Record<string, unknown>): SessionUser {
  return {
    id: String(raw.id ?? ""),
    email: String(raw.email ?? ""),
    fullName: String(raw.fullName ?? ""),
    role: raw.role as Role,
    tailingDamIds: Array.isArray(raw.tailingDamIds) ? (raw.tailingDamIds as unknown[]).map(String) : [],
    active: Boolean(raw.active),
  };
}
