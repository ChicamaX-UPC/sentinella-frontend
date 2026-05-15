/**
 * Cliente HTTP hacia el BFF (`/api/backend/...` → gateway `GET/POST .../api/v1/...`).
 * JWT va en cookies httpOnly.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `/api/backend/${path.replace(/^\//, "")}`;
  return fetch(url, {
    ...init,
    credentials: "include",
  });
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}`, res.status, text);
  }
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

/** Serializa query string para rutas tipo `alerts?status=ACTIVE`. Omite vacíos. */
export function withQuery(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  const base = path.replace(/^\//, "");
  if (!params) {
    return base;
  }
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") {
      continue;
    }
    sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `${base}?${q}` : base;
}
