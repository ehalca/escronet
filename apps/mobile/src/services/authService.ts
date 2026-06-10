import { api } from "../api/api";
import {
  getDeviceId,
  getToken,
  setToken,
  setUserId,
} from "../storage/authStore";

export async function ensureAuthenticated(): Promise<void> {
  if (getToken()) return;

  const deviceId = getDeviceId();
  const { token, userId } = await api.auth.register({ deviceId });

  setToken(token);
  setUserId(userId);
}
