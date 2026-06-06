import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

type ScamAlertPushPayload = {
  userId: string;
  score: number;
  detectedAt: string;
  displayName: string;
};

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private readonly isEnabled: boolean;

  constructor(config: ConfigService) {
    this.isEnabled = config.get<string>("FCM_ENABLED", "false") === "true";

    if (this.isEnabled && getApps().length === 0) {
      initializeApp({ credential: applicationDefault() });
    }
  }

  async sendScamAlert(
    token: string,
    payload: ScamAlertPushPayload,
  ): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn("FCM disabled; alert was logged but not pushed.");
      return;
    }

    await getMessaging().send({
      token,
      notification: {
        title: "Potential scam call detected",
        body: `${payload.displayName}, your contact may need help right now.`,
      },
      data: {
        userId: payload.userId,
        score: payload.score.toFixed(2),
        detectedAt: payload.detectedAt,
      },
    });
  }
}
