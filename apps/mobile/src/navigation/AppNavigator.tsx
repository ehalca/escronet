import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import type { RootStackParamList } from "./types";
import { TabNavigator } from "./TabNavigator";
import { ensureAuthenticated } from "../services/authService";
import { initMigration, syncIfStale } from "../services/migrationService";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator(): React.JSX.Element {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function bootstrap(): Promise<void> {
      try {
        await ensureAuthenticated();
        await initMigration();
        await syncIfStale();
      } catch (err) {
        console.error("[AppNavigator] bootstrap error:", err);
      } finally {
        setReady(true);
      }
    }
    bootstrap();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D1B2A" }}>
        <ActivityIndicator size="large" color="#4FC3F7" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
