import { readFileSync } from "fs";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const path = this.config.get<string>("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!path) {
      this.logger.warn(
        "FIREBASE_SERVICE_ACCOUNT_JSON not set — Firebase disabled (push notifications will be skipped)",
      );
      return;
    }
    this.logger.log(`[init] reading service account from ${path}`);
    let serviceAccount: Record<string, unknown>;
    try {
      serviceAccount = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    } catch (err) {
      this.logger.error(`[init] failed to read/parse service account file: ${String(err)}`);
      return;
    }
    const projectId = serviceAccount["project_id"] ?? serviceAccount["projectId"] ?? "unknown";
    this.app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    this.logger.log(`[init] Firebase Admin initialized projectId=${String(projectId)}`);
  }

  get isReady(): boolean {
    return this.app !== null;
  }

  messaging(): admin.messaging.Messaging {
    if (!this.app) throw new Error("Firebase not initialized");
    return this.app.messaging();
  }

  auth(): admin.auth.Auth {
    if (!this.app) throw new Error("Firebase not initialized");
    return this.app.auth();
  }
}
