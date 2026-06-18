import { z } from "zod";
import { ScamType } from "../enums/scam-type.enum";

export const CreateReportInputSchema = z.object({
  alertId: z.string().uuid(),
  type: z.nativeEnum(ScamType),
});

export const ReportRecordSchema = z.object({
  id: z.string().uuid(),
  alertId: z.string().uuid(),
  reporterId: z.string().uuid(),
  type: z.nativeEnum(ScamType),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateReportResponseSchema = z.object({
  report: ReportRecordSchema,
});

export type CreateReportInput = z.infer<typeof CreateReportInputSchema>;
export type ReportRecord = z.infer<typeof ReportRecordSchema>;
export type CreateReportResponse = z.infer<typeof CreateReportResponseSchema>;
