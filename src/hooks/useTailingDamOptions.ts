"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiJson } from "@/lib/api/http";
import { formatTailingDamLabel } from "@/lib/ui/tailing-dam-labels";
import { useSessionStore } from "@/stores/useSessionStore";

type RelaveResource = {
  id: string;
  name: string;
  tailingDamId: string;
};

export type TailingDamOption = {
  id: string;
  label: string;
};

export function useTailingDamOptions(enabled = true) {
  const user = useSessionStore((s) => s.user);
  const [fromApi, setFromApi] = useState<TailingDamOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    setLoading(true);
    apiJson<RelaveResource[]>("relaves")
      .then((relaves) =>
        setFromApi(
          relaves.map((r) => ({
            id: r.tailingDamId,
            label: formatTailingDamLabel(r.tailingDamId, r.name),
          }))
        )
      )
      .catch((e: unknown) => {
        if (!(e instanceof ApiError) || e.status !== 403) {
          setFromApi([]);
        }
      })
      .finally(() => setLoading(false));
  }, [enabled]);

  const options = useMemo(() => {
    const byId = new Map<string, string>();
    for (const option of fromApi) {
      byId.set(option.id, option.label);
    }
    for (const id of user?.tailingDamIds ?? []) {
      if (!byId.has(id)) {
        byId.set(id, formatTailingDamLabel(id));
      }
    }
    return [...byId.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [fromApi, user?.tailingDamIds]);

  const labelById = useMemo(() => new Map(options.map((o) => [o.id, o.label])), [options]);

  const getTailingDamLabel = useCallback(
    (id: string | null | undefined, fallback = "—"): string => {
      if (!id) {
        return fallback;
      }
      return labelById.get(id) ?? formatTailingDamLabel(id);
    },
    [labelById]
  );

  return { options, labelById, getTailingDamLabel, loading };
}
