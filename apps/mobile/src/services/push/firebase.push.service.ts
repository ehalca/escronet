import {
  getMessaging,
  requestPermission,
  getToken,
  onMessage,
  onTokenRefresh,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";
import { Platform } from "react-native";
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
    try {
      // On iOS, APNs registration only completes after the user grants permission,
      // so we must request it before calling getToken() or Firebase will throw.
      if (Platform.OS === "ios") {
        const status = await requestPermission(getMessaging());
        if (
          status !== AuthorizationStatus.AUTHORIZED &&
          status !== AuthorizationStatus.PROVISIONAL
        ) {
          return null;
        }
      }
      return await getToken(getMessaging());
    } catch (err) {
      console.warn("[FirebasePushService] getToken() failed:", err);
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
