import { z } from "zod";

export const GuardianRecordSchema = z.object({
  id: z.string().uuid(),
  /** Name the protected USER gave to this guardian */
  userLabel: z.string().nullable(),
  /** Name the GUARDIAN gave to the user they protect */
  guardianLabel: z.string().nullable(),
  guardianUserId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export const ListGuardiansResponseSchema = z.object({
  guardians: z.array(GuardianRecordSchema),
});

export const GuardedUserSchema = z.object({
  id: z.string().uuid(),
  userLabel: z.string().nullable(),
  guardianLabel: z.string().nullable(),
  userId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export const ListGuardedUsersResponseSchema = z.object({
  guardedUsers: z.array(GuardedUserSchema),
});

export const UpdateLabelInputSchema = z.object({
  label: z.string().min(1).max(100),
});

export type GuardianRecord = z.infer<typeof GuardianRecordSchema>;
export type ListGuardiansResponse = z.infer<typeof ListGuardiansResponseSchema>;
export type GuardedUser = z.infer<typeof GuardedUserSchema>;
export type ListGuardedUsersResponse = z.infer<typeof ListGuardedUsersResponseSchema>;
export type UpdateLabelInput = z.infer<typeof UpdateLabelInputSchema>;
