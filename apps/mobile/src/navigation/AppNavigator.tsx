import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { LinkingOptions } from "@react-navigation/native";
import { AppState, View, ActivityIndicator, NativeModules, PermissionsAndroid, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { getAuth } from "@react-native-firebase/auth";
import { SmsOtpBanner } from "../components/SmsOtpBanner";
import notifee from "@notifee/react-native";

const OverlayPermission = NativeModules.OverlayPermission as
  | { isGranted: () => Promise<boolean>; requestPermission: () => void }
  | undefined;
import type { RootStackParamList } from "./types";
import { TabNavigator } from "./TabNavigator";
import { navigationRef, navigateToAlerts } from "./navigationRef";
import { ensureAuthenticated, listenForAccountDeletion, listenForTokenRefresh } from "../services/authService";
import { clearAuth } from "../storage/authStore";
import { api } from "../api/api";
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
  const disconnectWsRef = useRef<(() => void) | undefined>(undefined);
  const isResettingRef = useRef(false);
  const queryClient = useQueryClient();

  const resetToFreshIdentity = useCallback(async () => {
    if (isResettingRef.current) return;
    isResettingRef.current = true;
    try {
      disconnectWsRef.current?.();
      disconnectWsRef.current = undefined;
      await getAuth().signOut().catch(() => null);
      clearAuth();
      queryClient.clear();
      await ensureAuthenticated();
      disconnectWsRef.current = await connectWs().catch(() => undefined);
      if (Platform.OS === "android") await syncIfStale().catch(() => null);
    } finally {
      isResettingRef.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    // Call event listener is Android-only — no native call detection on iOS yet.
    const stopCallListener = Platform.OS === "android" ? startCallEventListener() : undefined;
    const stopTokenRefresh = listenForTokenRefresh();
    const stopForegroundMessages = listenForForegroundMessages();
    const stopNotificationPress = listenForNotificationPress();
    return () => {
      stopCallListener?.();
      stopTokenRefresh();
      stopForegroundMessages();
      stopNotificationPress();
    };
  }, []);

  // Foreground check: when the app resumes, verify the account still exists.
  // The auth guard returns 401 the moment the DB row is gone, so this fires
  // within seconds of the user coming back — not after the token expiry (~1h).
  useEffect(() => {
    let prevState = AppState.currentState;
    const sub = AppState.addEventListener("change", async (nextState) => {
      if (prevState !== "active" && nextState === "active") {
        if (getAuth().currentUser) {
          try {
            await api.account.me();
          } catch (err) {
            if (String(err).includes("401")) {
              await resetToFreshIdentity();
            }
          }
        }
      }
      prevState = nextState;
    });
    return () => sub.remove();
  }, [resetToFreshIdentity]);

  useEffect(() => {
    const stopDeletion = listenForAccountDeletion(() => { void resetToFreshIdentity(); });

    async function bootstrap(): Promise<void> {
      try {
        await createNotificationChannels();
        await ensureAuthenticated();
        disconnectWsRef.current = await connectWs();
        // Caller sync feeds the Android call detection pipeline — skip on iOS.
        if (Platform.OS === "android") {
          await initMigration();
          await syncIfStale();
        }
        if (Platform.OS === "android") {
          // RECEIVE_SMS — dangerous permission required so the Kotlin service
          // can intercept SMS during an active call to detect OTP codes.
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

          // Request "Display over other apps" permission so the system overlay
          // can appear over the phone dialer when an OTP SMS arrives mid-call.
          if (OverlayPermission) {
            const granted = await OverlayPermission.isGranted().catch(() => true);
            if (!granted) OverlayPermission.requestPermission();
          }
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
    return () => {
      stopDeletion();
      disconnectWsRef.current?.();
    };
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
      {/* SmsOtpBanner requires call + SMS detection — Android only for now */}
      {Platform.OS === "android" && <SmsOtpBanner />}
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
    </View>
  );
}
