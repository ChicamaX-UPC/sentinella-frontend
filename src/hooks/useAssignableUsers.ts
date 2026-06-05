"use client";

import { useEffect, useState } from "react";
import { ApiError, apiJson } from "@/lib/api/http";

export type AssignableUser = {
  id: string;
  fullName: string;
  email: string;
};

export function useAssignableUsers(enabled = true) {
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    setLoading(true);
    setError(null);
    apiJson<AssignableUser[]>("users/assignable")
      .then(setUsers)
      .catch((e: unknown) => {
        setUsers([]);
        setError(e instanceof ApiError ? `Error ${e.status}` : "No se pudieron cargar usuarios");
      })
      .finally(() => setLoading(false));
  }, [enabled]);

  return { users, loading, error };
}

export function labelAssignableUser(u: AssignableUser): string {
  return `${u.fullName} · ${u.email}`;
}
