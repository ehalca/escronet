import { MMKV } from "react-native-mmkv";

const storage = new MMKV({ id: "auth" });

export function getPrivateKeyB64(): string | undefined {
  return storage.getString("privateKey") ?? undefined;
}

export function setPrivateKeyB64(key: string): void {
  storage.set("privateKey", key);
}

export function getUserId(): string | undefined {
  return storage.getString("userId") ?? undefined;
}

export function setUserId(id: string): void {
  storage.set("userId", id);
}

export function clearAuth(): void {
  storage.delete("privateKey");
  storage.delete("userId");
}
