import { mobileDb } from "./db";

const ALERTS_KEY = "active";

export async function savePhotoDraft(roundId: string, itemId: string, blob: Blob, mime: string): Promise<void> {
  await mobileDb.photoDrafts.where("roundId").equals(roundId).filter((r) => r.itemId === itemId).delete();
  await mobileDb.photoDrafts.add({ roundId, itemId, blob, mime, createdAt: Date.now() });
}

export async function saveAlertsCache(json: string): Promise<void> {
  await mobileDb.alertsCache.put({ key: ALERTS_KEY, json, updatedAt: Date.now() });
}

export async function loadAlertsCache(): Promise<string | null> {
  const row = await mobileDb.alertsCache.get(ALERTS_KEY);
  return row?.json ?? null;
}

export async function saveRoundSnapshot(roundId: string, json: string): Promise<void> {
  await mobileDb.roundSnapshots.put({ roundId, json, updatedAt: Date.now() });
}

export async function loadRoundSnapshot(roundId: string): Promise<string | null> {
  const row = await mobileDb.roundSnapshots.get(roundId);
  return row?.json ?? null;
}

export async function deletePhotoDraftsForItem(roundId: string, itemId: string): Promise<void> {
  await mobileDb.photoDrafts.where("roundId").equals(roundId).filter((r) => r.itemId === itemId).delete();
}
