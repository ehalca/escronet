import { z } from "zod";
import { RiskLevel } from "../enums/risk-level.enum";
import { ScamType } from "../enums/scam-type.enum";

export const AlertStatusSchema = z.enum(["active", "hung"]);
export type AlertStatus = z.infer<typeof AlertStatusSchema>;

export const UpdateAlertStatusInputSchema = z.object({
  status: AlertStatusSchema,
});
export type UpdateAlertStatusInput = z.infer<typeof UpdateAlertStatusInputSchema>;

export const UpdateAlertRiskInputSchema = z.object({
  riskLevel: z.nativeEnum(RiskLevel),
});
export type UpdateAlertRiskInput = z.infer<typeof UpdateAlertRiskInputSchema>;

export const CreateAlertInputSchema = z.object({
  callerHash: z.string().min(1),
  riskLevel: z.nativeEnum(RiskLevel),
  score: z.number().min(0).max(1).optional(),
  transcriptSnippet: z.string().optional(),
  category: z.string().optional(),
  callDuration: z.number().int().min(0).optional(),
  detectedAt: z.string().datetime(),
  callStartedAt: z.string().datetime().optional(),
});

export const AlertRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  callerHash: z.string(),
  riskLevel: z.nativeEnum(RiskLevel),
  score: z.number().nullable(),
  transcriptSnippet: z.string().nullable(),
  category: z.string().nullable(),
  callDuration: z.number().int().nullable(),
  callStartedAt: z.string().datetime().nullable(),
  detectedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: AlertStatusSchema,
  hungAt: z.string().datetime().nullable(),
  myReport: z
    .object({ id: z.string().uuid(), type: z.nativeEnum(ScamType) })
    .nullable(),
});

export const AlertInNotificationSchema = z.object({
  riskLevel: z.nativeEnum(RiskLevel),
  callerHash: z.string(),
  callDuration: z.number().int().nullable(),
  callStartedAt: z.string().datetime().nullable(),
  detectedAt: z.string().datetime(),
  transcriptSnippet: z.string().nullable(),
  category: z.string().nullable(),
  score: z.number().nullable(),
  status: AlertStatusSchema,
  hungAt: z.string().datetime().nullable(),
});

export const AlertNotificationRecordSchema = z.object({
  id: z.string().uuid(),
  alertId: z.string().uuid(),
  guardianUserId: z.string().uuid(),
  delivered: z.boolean(),
  deliveredAt: z.string().datetime().nullable(),
  seen: z.boolean(),
  seenAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  /** Alert details embedded so clients don't need a second fetch */
  alert: AlertInNotificationSchema,
  /** ID of the protected user who received the suspicious call */
  protectedUserId: z.string().uuid(),
  /** Label the guardian gave to this protected user (from GuardianRelation.guardianLabel) */
  protectedUserLabel: z.string().nullable(),
  myReport: z
    .object({ id: z.string().uuid(), type: z.nativeEnum(ScamType) })
    .nullable(),
});

export const CreateAlertResponseSchema = z.object({
  alertId: z.string().uuid(),
  notificationsDispatched: z.number().int(),
});

export const ListMyAlertsResponseSchema = z.object({
  alerts: z.array(AlertRecordSchema),
});

export const ListAlertNotificationsResponseSchema = z.object({
  notifications: z.array(AlertNotificationRecordSchema),
});

export type CreateAlertInput = z.infer<typeof CreateAlertInputSchema>;
export type AlertRecord = z.infer<typeof AlertRecordSchema>;
export type AlertInNotification = z.infer<typeof AlertInNotificationSchema>;
export type AlertNotificationRecord = z.infer<typeof AlertNotificationRecordSchema>;
export type CreateAlertResponse = z.infer<typeof CreateAlertResponseSchema>;
export type ListMyAlertsResponse = z.infer<typeof ListMyAlertsResponseSchema>;
export type ListAlertNotificationsResponse = z.infer<typeof ListAlertNotificationsResponseSchema>;
