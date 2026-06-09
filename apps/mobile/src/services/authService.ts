import { trpc } from "../api/trpc";
import {
  getDeviceId,
  getToken,
  setToken,
  setUserId,
} from "../storage/authStore";

export async function ensureAuthenticated(): Promise<void> {
  if (getToken()) return;

  const deviceId = getDeviceId();
  const { token, userId } = await trpc.auth.register.mutate({ deviceId });

  setToken(token);
  setUserId(userId);
}
