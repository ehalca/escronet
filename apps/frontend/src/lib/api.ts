import { createApiClient } from "@escronet/shared";

export const api = createApiClient(
  process.env.NEXT_PUBLIC_BACKEND_URL
    ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`
    : "http://localhost:3000/api",
);
