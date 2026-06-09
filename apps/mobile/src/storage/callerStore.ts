import { open } from "@op-engineering/op-sqlite";
import type { CallerDeltaRecord } from "@escronet/shared/src/schemas/caller.schema";

const db = open({ name: "escronet.db" });

export async function initCallerStore(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS callers (
      id           TEXT PRIMARY KEY,
      phone_number TEXT NOT NULL UNIQUE,
      risk_level   TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      delete_at    TEXT
    );
  `);
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_callers_updated_at ON callers(updated_at);",
  );
}

export async function upsertCaller(record: CallerDeltaRecord): Promise<void> {
  if (record.deleteAt) {
    await db.execute("DELETE FROM callers WHERE id = ?", [record.id]);
    return;
  }
  await db.execute(
    `INSERT INTO callers(id, phone_number, risk_level, created_at, updated_at, delete_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       phone_number = excluded.phone_number,
       risk_level   = excluded.risk_level,
       updated_at   = excluded.updated_at,
       delete_at    = excluded.delete_at`,
    [
      record.id,
      record.phoneNumber,
      record.riskLevel,
      record.createdAt,
      record.updatedAt,
      record.deleteAt,
    ],
  );
}

export async function lookupCallerByPhone(
  phoneNumber: string,
): Promise<CallerDeltaRecord | null> {
  const result = await db.execute(
    "SELECT * FROM callers WHERE phone_number = ? AND delete_at IS NULL LIMIT 1",
    [phoneNumber],
  );
  const row = result.rows?.[0];
  if (!row) return null;
  return {
    id: row["id"] as string,
    phoneNumber: row["phone_number"] as string,
    riskLevel: row["risk_level"] as import("@escronet/shared").RiskLevel,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
    deleteAt: (row["delete_at"] as string | null) ?? null,
  };
}
