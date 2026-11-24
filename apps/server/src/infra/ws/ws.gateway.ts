import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { Logger } from '@nestjs/common';
import type { ServerPushEvents } from '@carelink/shared-types';

interface WsUser {
  userId: string;
  orgId: string;
  role: string;
}

@WebSocketGateway({ namespace: '/ws', cors: { origin: true, credentials: true } })
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WsGateway.name);

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization ?? '').replace('Bearer ', '');
      if (!token) {
        client.disconnect(true);
        return;
      }
      const payload = verify(token, process.env.JWT_SECRET as string) as WsUser & { sub: string };
      const user: WsUser = {
        userId: payload.sub,
        orgId: payload.orgId,
        role: payload.role,
      };
      (client.data as { user: WsUser }).user = user;
      await client.join(`org:${user.orgId}`);
      await client.join(`user:${user.userId}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket): void {
    // socket.io 断开时自动清理房间订阅
  }

  emitToOrg<K extends keyof ServerPushEvents>(
    orgId: string,
    event: K,
    payload: ServerPushEvents[K],
  ): void {
    this.server.to(`org:${orgId}`).emit(event, payload);
  }

  emitToUser<K extends keyof ServerPushEvents>(
    userId: string,
    event: K,
    payload: ServerPushEvents[K],
  ): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}