import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@escronet/shared";
import { getToken } from "../storage/authStore";

const BACKEND_URL = __DEV__
  ? "http://10.0.2.2:3000/trpc"
  : "https://api.escronet.com/trpc";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: BACKEND_URL,
      headers: () => {
        const token = getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
