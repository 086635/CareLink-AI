import { io, Socket } from 'socket.io-client';
import type { ServerPushEvents } from '@carelink/shared-types';

export function createSocket(getToken: () => string | null): Socket {
  return io('/ws', {
    transports: ['websocket'],
    autoConnect: false,
    auth: (cb) => cb({ token: getToken() }),
  });
}

export type ServerSocket = Socket;
export type PushEventName = keyof ServerPushEvents;