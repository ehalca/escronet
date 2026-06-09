import { z } from "zod";
import { RiskLevel } from "../enums/risk-level.enum";

export const CallerDeltaRecordSchema = z.object({
  id: z.string().uuid(),
  phoneNumber: z.string(),
  riskLevel: z.nativeEnum(RiskLevel),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deleteAt: z.string().datetime().nullable(),
});

export type CallerDeltaRecord = z.infer<typeof CallerDeltaRecordSchema>;

export const CallerDeltaQuerySchema = z.object({
  lastSyncDate: z.string().datetime(),
  limit: z.number().int().min(1).max(5000).default(1000),
});

export type CallerDeltaQuery = z.infer<typeof CallerDeltaQuerySchema>;
