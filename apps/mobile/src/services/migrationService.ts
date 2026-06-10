import { MMKV } from "react-native-mmkv";
import { api } from "../api/api";
import { initCallerStore, upsertCaller } from "../storage/callerStore";

const storage = new MMKV({ id: "migration" });

const STALENESS_THRESHOLD_MS = 15 * 60 * 1000;

export async function initMigration(): Promise<void> {
  await initCallerStore();
}

export async function syncIfStale(): Promise<void> {
  const lastSyncAt = storage.getString("lastSyncAt");
  if (lastSyncAt) {
    const elapsed = Date.now() - new Date(lastSyncAt).getTime();
    if (elapsed < STALENESS_THRESHOLD_MS) {
      console.log(
        `[callerSync] skipping sync — last sync ${Math.round(elapsed / 1000)}s ago (threshold ${STALENESS_THRESHOLD_MS / 1000}s)`,
      );
      return;
    }
  }
  await syncCallers();
}

export async function syncCallers(): Promise<void> {
  const lastSyncDate =
    storage.getString("lastSyncAt") ?? new Date(0).toISOString();

  console.log(`[callerSync] starting sync since ${lastSyncDate}`);

  let records: Awaited<ReturnType<typeof api.callers.delta>>["records"];
  try {
    ({ records } = await api.callers.delta({ lastSyncDate, limit: 1000 }));
  } catch (err) {
    console.error("[callerSync] delta fetch failed", err);
    throw err;
  }

  console.log(`[callerSync] received ${records.length} record(s)`);

  for (const record of records) {
    await upsertCaller(record);
  }

  const syncedAt = new Date().toISOString();
  storage.set("lastSyncAt", syncedAt);
  console.log(`[callerSync] sync complete, lastSyncAt=${syncedAt}`);
}
