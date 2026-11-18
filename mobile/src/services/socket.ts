import { io, Socket } from 'socket.io-client';
import { BASE_URL } from './api';

/**
 * One long-lived Socket.IO client. On login/logout we only change its auth token and
 * reconnect, so listeners registered by hooks (tracking, route alerts) are never lost.
 */
let socket: Socket | null = null;

export function getSocket() {
  if (!socket) socket = io(BASE_URL, { transports: ['websocket'], auth: { token: null } });
  return socket;
}

/** Reconnect with the user's JWT so the server puts us in our personal `user:<id>` room. */
export function connectSocket(token: string | null) {
  const s = getSocket();
  s.auth = { token };
  s.disconnect().connect();
  return s;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.auth = { token: null };
  socket.disconnect();
}
