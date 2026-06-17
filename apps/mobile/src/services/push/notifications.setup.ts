import { DeviceEventEmitter, Platform } from "react-native";
import notifee, { AndroidImportance, EventType } from "@notifee/react-native";
import i18next from "i18next";
import { pushService } from "./index";
import { navigateToAlerts } from "../../navigation/navigationRef";
import { ALERT_LIST_CHANGED_EVENT } from "../callEventService";

export const ALERT_CHANNEL_ID = "escronet_alerts";

export async function createNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  await notifee.createChannel({
    id: ALERT_CHANNEL_ID,
    name: i18next.t("notifications.channelName"),
    importance: AndroidImportance.HIGH,
    vibration: true,
    description: i18next.t("notifications.channelDescription"),
  });
}

export function listenForNotificationPress(): () => void {
  return notifee.onForegroundEvent(({ type }) => {
    if (type === EventType.PRESS) {
      navigateToAlerts();
    }
  });
}

export function buildGuardianNotification(
  type: string,
  label: string | undefined,
): { title: string; body: string } {
  const key = type === "alert_retry"
    ? "alertRetry"
    : type === "risk_escalated"
    ? "riskEscalated"
    : "alertCreated";

  const title = i18next.t(`notifications.${key}.title`);
  const body = label
    ? i18next.t(`notifications.${key}.body`, { name: label })
    : i18next.t(`notifications.${key}.bodyGeneric`);

  return { title, body };
}

export function listenForForegroundMessages(): () => void {
  return pushService.onMessage((message) => {
    DeviceEventEmitter.emit(ALERT_LIST_CHANGED_EVENT);

    const type = message.data?.type ?? "alert_created";
    const label = message.data?.protectedUserLabel || undefined;
    const { title, body } = buildGuardianNotification(type, label);

    void notifee
      .displayNotification({
        title,
        body,
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
