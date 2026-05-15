import { mobileDb } from "./db";
import { countPendingOutbox } from "./outbox";

export async function countPhotoDrafts(): Promise<number> {
  return mobileDb.photoDrafts.count();
}

export async function countMobilePendingTotal(): Promise<number> {
  const [o, p] = await Promise.all([countPendingOutbox(), countPhotoDrafts()]);
  return o + p;
}
