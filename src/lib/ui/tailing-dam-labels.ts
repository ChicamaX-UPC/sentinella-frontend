/** Tranques conocidos (demo / seed backend). Claves en minúsculas para lookup estable. */
export const KNOWN_TAILINGS: Record<string, string> = {
  "a1e8c0de-4b2a-4c1f-9f3d-8c7b6a5d4e3f": "Chicama Norte",
};

export function shortEntityId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export function formatTailingDamLabel(id: string, name?: string | null): string {
  if (name?.trim()) {
    return name.trim();
  }
  const known = KNOWN_TAILINGS[id.toLowerCase()];
  if (known) {
    return known;
  }
  return shortEntityId(id);
}
