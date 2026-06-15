import { open } from "@op-engineering/op-sqlite";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";

const db = open({ name: "escronet.db" });

export type ScamHashRecord = {
  phoneHash: string;
  confidence: number;
  reportCount: number;
  source: string;
  updatedAt: string;
};

export async function initScamNumberStore(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS scam_numbers (
      phone_hash TEXT PRIMARY KEY,
      confidence INTEGER NOT NULL,
      report_count INTEGER NOT NULL,
      source TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_scam_numbers_updated_at ON scam_numbers(updated_at);",
  );
}

export function normalizeE164(rawPhone: string): string {
  return rawPhone.replace(/[^+\d]/g, "");
}

export function hashPhoneNumber(rawPhone: string): string {
  const normalized = normalizeE164(rawPhone);
  return bytesToHex(sha256(normalized));
}

export async function upsertScamHash(record: ScamHashRecord): Promise<void> {
  await db.execute(
    `
      INSERT INTO scam_numbers(phone_hash, confidence, report_count, source, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(phone_hash) DO UPDATE SET
        confidence = excluded.confidence,
        report_count = excluded.report_count,
        source = excluded.source,
        updated_at = excluded.updated_at
    `,
    [
      record.phoneHash,
      record.confidence,
      record.reportCount,
      record.source,
      record.updatedAt,
    ],
  );
}
