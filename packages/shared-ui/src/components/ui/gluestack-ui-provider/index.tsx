import React, { useEffect } from "react";
import { View, ViewProps } from "react-native";
import { useColorScheme } from "nativewind";
import { config } from "./config";

export type ModeType = "light" | "dark" | "system";

export function GluestackUIProvider({
  mode = "light",
  children,
  style,
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps["style"];
}) {
  const { setColorScheme, colorScheme } = useColorScheme();

  // useEffect(() => {
  // setColorScheme(mode === 'system' ? 'system' : mode);
  // }, [mode, setColorScheme]);

  return (
    <View style={[config[colorScheme ?? "light"], { flex: 1 }, style]}>
      {children}
    </View>
  );
}
