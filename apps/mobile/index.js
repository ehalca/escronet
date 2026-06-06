import { AppRegistry } from "react-native";
import { App } from "./src/App";
import notifee from "@notifee/react-native";

// Keeps the foreground service alive until stopForegroundService() is called.
// The promise is resolved externally via the module-level ref in callDetectionService.
notifee.registerForegroundService(() => {
  return new Promise((resolve) => {
    // eslint-disable-next-line no-undef
    global.__stopCallMonitorService = resolve;
  });
});

notifee.onBackgroundEvent(async () => {
  // Required by notifee — handle background notification interactions here later
});

AppRegistry.registerComponent("Escronet", () => App);
