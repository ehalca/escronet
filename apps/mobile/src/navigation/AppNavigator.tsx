import React, { useEffect, useRef, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { LinkingOptions } from "@react-navigation/native";
import { View, ActivityIndicator, NativeModules, PermissionsAndroid, Platform } from "react-native";
import { SmsOtpBanner } from "../components/SmsOtpBanner";
import notifee from "@notifee/react-native";

const OverlayPermission = NativeModules.OverlayPermission as
  | { isGranted: () => Promise<boolean>; requestPermission: () => void }
  | undefined;
import type { RootStackParamList } from "./types";
import { TabNavigator } from "./TabNavigator";
import { navigationRef, navigateToAlerts } from "./navigationRef";
import { ensureAuthenticated, listenForTokenRefresh } from "../services/authService";
import { startCallEventListener } from "../services/callEventService";
import { connectWs } from "../services/wsService";
import { initMigration, syncIfStale } from "../services/migrationService";
import {
  createNotificationChannels,
  listenForForegroundMessages,
  listenForNotificationPress,
} from "../services/push/notifications.setup";

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["escronet://", "https://escro.net"],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Settings: {
            screens: {
              Guardian: {
                path: "link",
                parse: { code: (v: string) => v.toUpperCase() },
              },
            },
          },
        },
      },
    },
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const openAlertsOnReadyRef = useRef(false);

  useEffect(() => {
    const stopCallListener = startCallEventListener();
    const stopTokenRefresh = listenForTokenRefresh();
    const stopForegroundMessages = listenForForegroundMessages();
    const stopNotificationPress = listenForNotificationPress();
    return () => {
      stopCallListener();
      stopTokenRefresh();
      stopForegroundMessages();
      stopNotificationPress();
    };
  }, []);

  useEffect(() => {
    let disconnectWs: (() => void) | undefined;

    async function bootstrap(): Promise<void> {
      try {
        await createNotificationChannels();
        await ensureAuthenticated();
        disconnectWs = await connectWs();
        await initMigration();
        await syncIfStale();
        // RECEIVE_SMS — dangerous permission, must be requested at runtime.
        // Required so the Kotlin service can intercept SMS during an active call.
        if (Platform.OS === "android") {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
            {
              title: "SMS Permission",
              message:
                "Escronet needs to read incoming SMS to detect OTP codes sent during suspicious calls.",
              buttonPositive: "Allow",
              buttonNegative: "Deny",
            },
          ).catch(() => null);
        }

        // Request "Display over other apps" permission so the system overlay
        // can be shown over the phone dialer when an OTP SMS arrives mid-call.
        if (OverlayPermission) {
          const granted = await OverlayPermission.isGranted().catch(() => true);
          if (!granted) OverlayPermission.requestPermission();
        }

        // Check if the app was launched by tapping a notification (quit/background state)
        const initial = await notifee.getInitialNotification();
        if (initial) openAlertsOnReadyRef.current = true;
      } catch (err) {
        console.error("[AppNavigator] bootstrap error:", err);
      } finally {
        setReady(true);
      }
    }
    bootstrap();
    return () => { disconnectWs?.(); };
  }, []);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0D1B2A",
        }}
      >
        <ActivityIndicator size="large" color="#4FC3F7" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        onReady={() => {
          if (openAlertsOnReadyRef.current) {
            openAlertsOnReadyRef.current = false;
            navigateToAlerts();
          }
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
      <SmsOtpBanner />
    </View>
  );
}
