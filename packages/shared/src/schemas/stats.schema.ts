import { z } from "zod";
import { RiskLevel } from "../enums/risk-level.enum";

export const PublicStatsSchema = z.object({
  userCount: z.number(),
  guardianCount: z.number(),
  alertsByLevel: z.object({
    lowest: z.number(),
    low: z.number(),
    medium: z.number(),
    high: z.number(),
    highest: z.number(),
  }),
});

export type PublicStats = z.infer<typeof PublicStatsSchema>;

export const CallerCheckInputSchema = z.object({
  phone: z.string().min(1),
});

export type CallerCheckInput = z.infer<typeof CallerCheckInputSchema>;

export const CallerCheckResultSchema = z.object({
  inCallerDatabase: z.boolean(),
  callerRiskLevel: z.nativeEnum(RiskLevel).nullable(),
  totalAlerts: z.number(),
  alertsByLevel: z.object({
    lowest: z.number(),
    low: z.number(),
    medium: z.number(),
    high: z.number(),
    highest: z.number(),
  }),
});

export type CallerCheckResult = z.infer<typeof CallerCheckResultSchema>;
