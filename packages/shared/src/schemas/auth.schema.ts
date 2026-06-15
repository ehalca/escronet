import { z } from "zod";

export const RegisterDeviceInputSchema = z.object({
  registrationJwt: z.string().min(1),
  fcmToken: z.string().optional(),
});

export const AuthResponseSchema = z.object({
  customToken: z.string(),
  userId: z.string().uuid(),
});

export type RegisterDeviceInput = z.infer<typeof RegisterDeviceInputSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
