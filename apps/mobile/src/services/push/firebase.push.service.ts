import {
  getMessaging,
  requestPermission,
  getToken,
  onMessage,
  onTokenRefresh,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";
import type { IPushService, PushMessage } from "./push.types";

class FirebasePushService implements IPushService {
  async requestPermission(): Promise<boolean> {
    const status = await requestPermission(getMessaging());
    return (
      status === AuthorizationStatus.AUTHORIZED ||
      status === AuthorizationStatus.PROVISIONAL
    );
  }

  async getToken(): Promise<string | null> {
    // FCM tokens are device-level on Android and don't require notification permission.
    // requestPermission() is called separately — don't gate token retrieval on it.
    try {
      return await getToken(getMessaging());
    } catch (err) {
      console.warn("[FirebasePushService] getToken() failed — Firebase misconfigured or no Play Services:", err);
      return null;
    }
  }

  onMessage(handler: (message: PushMessage) => void): () => void {
    return onMessage(getMessaging(), (remote) =>
      handler({
        title: remote.notification?.title,
        body: remote.notification?.body,
        data: remote.data as Record<string, string> | undefined,
      }),
    );
  }

  onTokenRefresh(handler: (token: string) => void): () => void {
    return onTokenRefresh(getMessaging(), handler);
  }
}

export const pushService: IPushService = new FirebasePushService();
