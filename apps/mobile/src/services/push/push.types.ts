export interface PushMessage {
  title?: string;
  body?: string;
  data?: Record<string, string>;
}

export interface IPushService {
  requestPermission(): Promise<boolean>;
  getToken(): Promise<string | null>;
  onMessage(handler: (message: PushMessage) => void): () => void;
  onTokenRefresh(handler: (token: string) => void): () => void;
}
