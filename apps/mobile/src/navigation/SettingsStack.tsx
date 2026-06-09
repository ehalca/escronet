import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { SettingsStackParamList } from "./types";
import { SettingsScreen } from "../screens/SettingsScreen";
import { GuardianScreen } from "../screens/GuardianScreen";

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStack(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0D1B2A" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ title: t("settings.title") }}
      />
      <Stack.Screen
        name="Guardian"
        component={GuardianScreen}
        options={{ title: t("guardian.headerTitle") }}
      />
    </Stack.Navigator>
  );
}
