import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import type { TabParamList } from "./types";
import { HomeScreen } from "../screens/HomeScreen";
import { AlertsScreen } from "../screens/AlertsScreen";
import { SettingsStack } from "./SettingsStack";

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_BAR_STYLE = {
  backgroundColor: "#0D1B2A",
  borderTopColor: "#1E3A5F",
  borderTopWidth: 1,
};

const TAB_ICONS: Record<string, string> = { Home: "🏠", Alerts: "🔔", Settings: "⚙️" };

function TabIcon({ routeName, focused }: { routeName: string; focused: boolean }): React.JSX.Element {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{TAB_ICONS[routeName]}</Text>
  );
}

export function TabNavigator(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: keyof TabParamList } }) => ({
        headerShown: false,
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: "#4FC3F7",
        tabBarInactiveTintColor: "#607D8B",
        tabBarIcon: ({ focused }: { focused: boolean; color: string; size: number }) => (
          <TabIcon routeName={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t("tabs.home") }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ title: t("tabs.alerts") }} />
      <Tab.Screen name="Settings" component={SettingsStack} options={{ title: t("tabs.settings") }} />
    </Tab.Navigator>
  );
}
