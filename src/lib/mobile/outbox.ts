import { apiFetch } from "@/lib/api/http";
import { mobileDb, type OutboxRow } from "./db";
import { deletePhotoDraftsForItem } from "./offlineCache";

type EnqueueInput = Pick<OutboxRow, "method" | "path" | "body"> & { createdAt?: number };

export async function enqueueMutation(row: EnqueueInput): Promise<void> {
  await mobileDb.outbox.add({
    method: row.method,
    path: row.path,
    body: row.body,
    createdAt: row.createdAt ?? Date.now(),
    status: "queued",
  });
}

export async function countPendingOutbox(): Promise<number> {
  return mobileDb.outbox.where("status").equals("queued").count();
}

/** Reintenta POST/PATCH/DELETE encolados cuando hay red (Dexie + blueprint offline-first). */
export async function flushMutationOutbox(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }
  const pending = await mobileDb.outbox.where("status").equals("queued").sortBy("createdAt");
  for (const row of pending) {
    if (row.localId == null) {
      continue;
    }
    try {
      const res = await apiFetch(row.path, {
        method: row.method,
        headers: row.body ? { "Content-Type": "application/json" } : undefined,
        body: row.body ?? undefined,
      });
      if (res.ok || res.status === 204) {
        await mobileDb.outbox.delete(row.localId);
        if (row.method === "PATCH") {
          const m = /^rounds\/([^/]+)\/items\/([^/]+)$/.exec(row.path);
          if (m) {
            await deletePhotoDraftsForItem(m[1], m[2]);
          }
        }
      }
    } catch {
      break;
    }
  }
}
