import "./i18n";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GluestackProvider } from "@escronet/shared-ui";
import { AppNavigator } from "./navigation/AppNavigator";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <GluestackProvider>
        <AppNavigator />
      </GluestackProvider>
    </QueryClientProvider>
  );
}
