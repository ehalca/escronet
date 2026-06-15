import { getAuth } from "@react-native-firebase/auth";
import { createApiClient } from "@escronet/shared";

const BACKEND_URL = __DEV__
  ? "http://10.0.2.2:3010/api"
  : "https://api.escronet.com/api";

export const api = createApiClient(
  BACKEND_URL,
  () => getAuth().currentUser?.getIdToken() ?? null,
);
