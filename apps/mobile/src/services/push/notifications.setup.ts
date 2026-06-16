import { DeviceEventEmitter, Platform } from "react-native";
import notifee, { AndroidImportance, EventType } from "@notifee/react-native";
import { pushService } from "./index";
import { navigateToAlerts } from "../../navigation/navigationRef";
import { ALERT_LIST_CHANGED_EVENT } from "../callEventService";

export const ALERT_CHANNEL_ID = "escronet_alerts";

export async function createNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  await notifee.createChannel({
    id: ALERT_CHANNEL_ID,
    name: "Scam Alerts",
    importance: AndroidImportance.HIGH,
    vibration: true,
    description: "Alerts when a protected contact may be on a scam call",
  });
}

/**
 * Navigates to the Alerts screen when the user taps a notification while the
 * app is in the foreground or when the app is brought back from the background.
 * Returns an unsubscribe function for use in useEffect cleanup.
 */
export function listenForNotificationPress(): () => void {
  return notifee.onForegroundEvent(({ type }) => {
    if (type === EventType.PRESS) {
      navigateToAlerts();
    }
  });
}

/**
 * Displays push notifications while the app is in the foreground.
 * Background / quit-state notifications are shown automatically by the FCM SDK
 * using the channelId set in the FCM payload.
 * Returns an unsubscribe function for use in useEffect cleanup.
 */
export function listenForForegroundMessages(): () => void {
  return pushService.onMessage((message) => {
    // Signal AlertsScreen to refresh — this runs on the guardian's device when
    // the app is foregrounded and an alert push arrives.
    DeviceEventEmitter.emit(ALERT_LIST_CHANGED_EVENT);

    void notifee
      .displayNotification({
        title: message.title ?? "Scam Alert",
        body: message.body ?? "A contact may be on a scam call",
        ...(Platform.OS === "android"
          ? {
              android: {
                channelId: ALERT_CHANNEL_ID,
                importance: AndroidImportance.HIGH,
                pressAction: { id: "default" },
              },
            }
          : {
              ios: { sound: "default" },
            }),
      })
      .catch((err: unknown) =>
        console.warn("[notifications] foreground display failed:", err),
      );
  });
}
