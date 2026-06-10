import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

@WebSocketGateway({ cors: { origin: "*" }, namespace: "/guardian" })
export class GuardianEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  handleConnection(client: Socket): void {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }
    client.data.userId = token;
    void client.join(`user:${token}`);
  }

  handleDisconnect(_client: Socket): void {
    // cleanup handled automatically by socket.io room tracking
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
