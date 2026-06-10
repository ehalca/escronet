import { createApiClient } from "@escronet/shared";
import { getToken } from "../storage/authStore";

const BACKEND_URL = __DEV__
  ? "http://10.0.2.2:3000/api"
  : "https://api.escronet.com/api";

export const api = createApiClient(BACKEND_URL, getToken);
