import "./i18n";
import React from "react";
import { GluestackProvider } from "@escronet/shared-ui";
import { AppNavigator } from "./navigation/AppNavigator";

export function App(): React.JSX.Element {
  return (
    <GluestackProvider>
      <AppNavigator />
    </GluestackProvider>
  );
}
