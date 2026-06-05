/** Mensajes server → client (blueprint §7.3). */

export function parseWsMessage(raw: string): { event: string; payload: Record<string, unknown> } | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const event = typeof o.event === "string" ? o.event : "";
    if (!event) {
      return null;
    }
    return { event, payload: o };
  } catch {
    return null;
  }
}
