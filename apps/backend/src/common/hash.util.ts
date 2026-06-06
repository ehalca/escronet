import { createHash } from "crypto";

export function normalizeE164(rawPhone: string): string {
  return rawPhone.replace(/[^+\d]/g, "");
}

export function hashE164Phone(rawPhone: string): string {
  const normalized = normalizeE164(rawPhone);
  return createHash("sha256").update(normalized).digest("hex");
}
