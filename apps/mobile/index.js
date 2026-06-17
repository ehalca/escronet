import "react-native-get-random-values";
import "./global.css";
import { AppRegistry } from "react-native";
import { App } from "./src/App";
import notifee, { AndroidImportance } from "@notifee/react-native";
import { getMessaging, setBackgroundMessageHandler } from "@react-native-firebase/messaging";
import { buildGuardianNotification, ALERT_CHANNEL_ID } from "./src/services/push/notifications.setup";

// Keeps the foreground service alive until stopForegroundService() is called.
notifee.registerForegroundService(() => {
  return new Promise((resolve) => {
    // eslint-disable-next-line no-undef
    global.__stopCallMonitorService = resolve;
  });
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  // Notifee background events (notification press, dismiss, etc.)
  void type;
  void detail;
});

// Firebase background / quit-state message handler.
// Runs in a headless JS context — no React, but i18next is initialised via App import above.
setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
  const data = remoteMessage.data ?? {};
  const type = typeof data.type === "string" ? data.type : "alert_created";
  const label = typeof data.protectedUserLabel === "string" && data.protectedUserLabel
    ? data.protectedUserLabel
    : undefined;

  const { title, body } = buildGuardianNotification(type, label);

  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId: ALERT_CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: { id: "default" },
    },
  });
});

AppRegistry.registerComponent("Escronet", () => App);
