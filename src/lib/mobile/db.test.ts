import { describe, expect, it } from "vitest";
import { mobileDb } from "./db";
import { savePhotoDraft } from "./offlineCache";
import { countPendingOutbox, enqueueMutation, flushMutationOutbox } from "./outbox";
import { countPhotoDrafts } from "./pendingCounts";

describe("Dexie mobile DB", () => {
  it("opens and writes a pending round row", async () => {
    await mobileDb.pendingRounds.put({
      id: "round-test-1",
      payload: { ok: true },
      synced: false,
      updatedAt: Date.now(),
    });
    const row = await mobileDb.pendingRounds.get("round-test-1");
    expect(row?.synced).toBe(false);
    await mobileDb.pendingRounds.delete("round-test-1");
  });

  it("encola y cuenta mutaciones en outbox", async () => {
    await mobileDb.outbox.clear();
    await enqueueMutation({
      method: "POST",
      path: "rounds",
      body: "{}",
      createdAt: Date.now(),
    });
    expect(await countPendingOutbox()).toBe(1);
    await mobileDb.outbox.clear();
  });

  it("flushMutationOutbox no rompe sin red (cola vacía)", async () => {
    await mobileDb.outbox.clear();
    await expect(flushMutationOutbox()).resolves.toBeUndefined();
  });

  it("persiste borrador de foto en IndexedDB", async () => {
    await mobileDb.photoDrafts.clear();
    await savePhotoDraft("r1", "i1", new Blob(["x"], { type: "image/jpeg" }), "image/jpeg");
    expect(await countPhotoDrafts()).toBe(1);
    await mobileDb.photoDrafts.clear();
  });
});
