import { z } from "zod";

export const GenerateGuardianLinkResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string().length(6),
  qrUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});

export const ClaimGuardianLinkInputSchema = z.object({
  code: z.string().min(6).max(6).toUpperCase(),
  userLabel: z.string().min(1).max(100),
  guardianLabel: z.string().min(1).max(100).optional(),
});

export const ClaimGuardianLinkResponseSchema = z.object({
  relationId: z.string().uuid(),
  guardedUserId: z.string().uuid(),
});

export const GuardianLinkSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  expiresAt: z.string().datetime(),
  usedAt: z.string().datetime().nullable(),
});

export const ListGuardianLinksResponseSchema = z.object({
  links: z.array(GuardianLinkSchema),
});

export type GenerateGuardianLinkResponse = z.infer<typeof GenerateGuardianLinkResponseSchema>;
export type ClaimGuardianLinkInput = z.infer<typeof ClaimGuardianLinkInputSchema>;
export type ClaimGuardianLinkResponse = z.infer<typeof ClaimGuardianLinkResponseSchema>;
export type GuardianLinkRecord = z.infer<typeof GuardianLinkSchema>;
export type ListGuardianLinksResponse = z.infer<typeof ListGuardianLinksResponseSchema>;
