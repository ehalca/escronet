import "./i18n";
import React from "react";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { GluestackProvider } from "@escronet/shared-ui";
import { AppNavigator } from "./navigation/AppNavigator";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error(`[query ${JSON.stringify(query.queryKey)}]`, error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error("[mutation]", error);
    },
  }),
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
