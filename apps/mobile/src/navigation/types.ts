import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";

export type RootStackParamList = {
  MainTabs: undefined;
};

export type TabParamList = {
  Home: undefined;
  Alerts: undefined;
  Settings: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Guardian: undefined;
};

export type HomeScreenNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

export type SettingsScreenNavProp = NativeStackNavigationProp<SettingsStackParamList, "SettingsMain">;
export type GuardianScreenNavProp = NativeStackNavigationProp<SettingsStackParamList, "Guardian">;
