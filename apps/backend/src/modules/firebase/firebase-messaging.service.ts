import { Injectable, Logger } from "@nestjs/common";
import { FirebaseService } from "./firebase.service";

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class FirebaseMessagingService {
  private readonly logger = new Logger(FirebaseMessagingService.name);

  constructor(private readonly firebase: FirebaseService) {}

  async sendToDevice(fcmToken: string, payload: PushPayload): Promise<void> {
    if (!this.firebase.isReady) {
      this.logger.warn(
        `[sendToDevice] Firebase not initialized — push skipped (token=${fcmToken.slice(0, 12)}…)`,
      );
      return;
    }
    const tokenPrefix = fcmToken.slice(0, 12);
    this.logger.log(
      `[sendToDevice] sending to token=${tokenPrefix}… title="${payload.title}"`,
    );
    const response = await this.firebase.messaging().send({
      token: fcmToken,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
      android: {
        priority: "high",
        notification: { channelId: "escronet_alerts" },
      },
    });
    this.logger.log(`[sendToDevice] FCM accepted token=${tokenPrefix}… messageId=${response}`);
  }

  async sendToDevices(fcmTokens: string[], payload: PushPayload): Promise<void> {
    if (!this.firebase.isReady) {
      this.logger.warn(
        `[sendToDevices] Firebase not initialized — push skipped for ${fcmTokens.length} token(s)`,
      );
      return;
    }
    if (fcmTokens.length === 0) return;
    this.logger.log(
      `[sendToDevices] sending multicast to ${fcmTokens.length} token(s) title="${payload.title}"`,
    );
    const result = await this.firebase.messaging().sendEachForMulticast({
      tokens: fcmTokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
      android: {
        priority: "high",
        notification: { channelId: "escronet_alerts" },
      },
    });
    this.logger.log(
      `[sendToDevices] multicast done success=${result.successCount} failure=${result.failureCount}`,
    );
    if (result.failureCount > 0) {
      result.responses.forEach((r, i) => {
        if (!r.success) {
          this.logger.warn(
            `[sendToDevices] token[${i}]=${fcmTokens[i]!.slice(0, 12)}… error=${r.error?.message ?? "unknown"}`,
          );
        }
      });
    }
  }
}
