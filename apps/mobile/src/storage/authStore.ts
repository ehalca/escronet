import { MMKV } from "react-native-mmkv";

const storage = new MMKV({ id: "auth" });

export function getToken(): string | undefined {
  return storage.getString("token") ?? undefined;
}

export function setToken(token: string): void {
  storage.set("token", token);
}

export function getUserId(): string | undefined {
  return storage.getString("userId") ?? undefined;
}

export function setUserId(userId: string): void {
  storage.set("userId", userId);
}

export function getDeviceId(): string {
  let deviceId = storage.getString("deviceId");
  if (!deviceId) {
    deviceId = generateUUID();
    storage.set("deviceId", deviceId);
  }
  return deviceId;
}

export function clearAuth(): void {
  storage.delete("token");
  storage.delete("userId");
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
