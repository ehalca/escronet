import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { DataSource } from "typeorm";
import type { Server, Socket } from "socket.io";
import { User } from "../entities/user.entity";
import { FirebaseService } from "../modules/firebase/firebase.service";

@WebSocketGateway({ cors: { origin: "*" }, namespace: "/guardian" })
export class GuardianEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly firebase: FirebaseService,
    private readonly dataSource: DataSource,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const idToken = client.handshake.auth?.token as string | undefined;
    if (!idToken || !this.firebase.isReady) {
      client.disconnect();
      return;
    }

    let firebaseUid: string;
    try {
      const decoded = await this.firebase.auth().verifyIdToken(idToken);
      firebaseUid = decoded.uid;
    } catch {
      client.disconnect();
      return;
    }

    const user = await this.dataSource
      .getRepository(User)
      .findOneBy({ firebaseUid });

    if (!user) {
      client.disconnect();
      return;
    }

    client.data.userId = user.id;
    void client.join(`user:${user.id}`);
  }

  handleDisconnect(_client: Socket): void {
    // cleanup handled automatically by socket.io room tracking
  }

  notifyAlertStatusChanged(guardianUserIds: string[], alertId: string, status: string): void {
    for (const guardianUserId of guardianUserIds) {
      this.server.to(`user:${guardianUserId}`).emit("alert_status_changed", { alertId, status });
    }
  }

  notifyAlertRiskChanged(guardianUserIds: string[], alertId: string, riskLevel: string): void {
    for (const guardianUserId of guardianUserIds) {
      this.server.to(`user:${guardianUserId}`).emit("alert_risk_changed", { alertId, riskLevel });
    }
  }

  notifyPaired(
    userId: string,
    guardianUserId: string,
    relationId: string,
  ): void {
    this.server.to(`user:${userId}`).emit("guardian-paired", {
      relationId,
      guardianUserId,
    });
    this.server.to(`user:${guardianUserId}`).emit("guardian-paired", {
      relationId,
      guardedUserId: userId,
    });
  }

  notifyRemoved(
    userId: string,
    guardianUserId: string,
    relationId: string,
  ): void {
    this.server.to(`user:${userId}`).emit("guardian-removed", { relationId });
    this.server.to(`user:${guardianUserId}`).emit("guardian-removed", { relationId });
  }
}
