import { MMKV } from "react-native-mmkv";
import { trpc } from "../api/trpc";
import { initCallerStore, upsertCaller } from "../storage/callerStore";

const storage = new MMKV({ id: "migration" });

const STALENESS_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

export async function initMigration(): Promise<void> {
  await initCallerStore();
}

export async function syncIfStale(): Promise<void> {
  const lastSyncAt = storage.getString("lastSyncAt");
  if (lastSyncAt) {
    const elapsed = Date.now() - new Date(lastSyncAt).getTime();
    if (elapsed < STALENESS_THRESHOLD_MS) return;
  }
  await syncCallers();
}

export async function syncCallers(): Promise<void> {
  const lastSyncDate =
    storage.getString("lastSyncAt") ?? new Date(0).toISOString();

  const { records } = await trpc.callers.delta.query({
    lastSyncDate,
    limit: 1000,
  });

  for (const record of records) {
    await upsertCaller(record);
  }

  storage.set("lastSyncAt", new Date().toISOString());
}
