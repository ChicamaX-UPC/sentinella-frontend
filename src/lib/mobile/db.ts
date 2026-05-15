import Dexie, { type Table } from "dexie";

/** IndexedDB via Dexie — solo rutas /mobile/* (blueprint §9.3). */
export type PendingRoundRow = {
  id: string;
  payload: unknown;
  synced: boolean;
  updatedAt: number;
};

export type OutboxRow = {
  localId?: number;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: string;
  createdAt: number;
  status: "queued";
};

export type PhotoDraftRow = {
  id?: number;
  roundId: string;
  itemId: string;
  blob: Blob;
  mime: string;
  createdAt: number;
};

export type RoundSnapshotRow = {
  roundId: string;
  json: string;
  updatedAt: number;
};

export type AlertsCacheRow = {
  key: string;
  json: string;
  updatedAt: number;
};

export class SentinellaMobileDexie extends Dexie {
  pendingRounds!: Table<PendingRoundRow, string>;
  outbox!: Table<OutboxRow, number>;
  photoDrafts!: Table<PhotoDraftRow, number>;
  roundSnapshots!: Table<RoundSnapshotRow, string>;
  alertsCache!: Table<AlertsCacheRow, string>;

  constructor() {
    super("sentinella_mobile");
    this.version(1).stores({
      pendingRounds: "id, synced, updatedAt",
    });
    this.version(2).stores({
      pendingRounds: "id, synced, updatedAt",
      outbox: "++localId, status, createdAt",
    });
    this.version(3).stores({
      pendingRounds: "id, synced, updatedAt",
      outbox: "++localId, status, createdAt",
      photoDrafts: "++id, roundId, itemId, createdAt",
      roundSnapshots: "roundId, updatedAt",
      alertsCache: "key, updatedAt",
    });
  }
}

export const mobileDb = new SentinellaMobileDexie();
