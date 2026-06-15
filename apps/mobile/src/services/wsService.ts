import { getAuth } from "@react-native-firebase/auth";
import { io, Socket } from "socket.io-client";
import { DeviceEventEmitter } from "react-native";
import { ALERT_LIST_CHANGED_EVENT } from "./callEventService";

const WS_BASE_URL = __DEV__
  ? "http://10.0.2.2:3010"
  : "https://api.escronet.com";

let socket: Socket | null = null;

export async function connectWs(): Promise<() => void> {
  const token = await (getAuth().currentUser?.getIdToken() ?? null);
  if (!token) return () => {};

  socket = io(`${WS_BASE_URL}/guardian`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10_000,
  });

  socket.on("alert_status_changed", () => {
    DeviceEventEmitter.emit(ALERT_LIST_CHANGED_EVENT);
  });

  socket.on("alert_risk_changed", () => {
    DeviceEventEmitter.emit(ALERT_LIST_CHANGED_EVENT);
  });

  return () => {
    socket?.disconnect();
    socket = null;
  };
}
