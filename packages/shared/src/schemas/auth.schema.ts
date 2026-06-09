import { z } from "zod";

export const RegisterDeviceInputSchema = z.object({
  deviceId: z.string().min(1),
  fcmToken: z.string().optional(),
});

export const AuthTokenSchema = z.object({
  token: z.string(),
  userId: z.string(),
});

export type RegisterDeviceInput = z.infer<typeof RegisterDeviceInputSchema>;
export type AuthToken = z.infer<typeof AuthTokenSchema>;
