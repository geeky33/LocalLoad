import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { verifyToken } from '../middleware/auth';
import { SimulationEngine } from '../simulation/engine';

/**
 * Rooms:
 *   train:<instanceId>  - clients tracking that train get position / crowd / delay updates
 *   user:<userId>       - personal route alerts
 *   feed                - Home screens listening for any new crowd/delay report
 *   station:<name>      - users whose nearest station is <name> (arrival alerts)
 */
export function initSockets(httpServer: HttpServer, engine: SimulationEngine) {
  const io = new Server(httpServer, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    const token = (socket.handshake.auth as { token?: string })?.token;
    const user = token ? verifyToken(token) : null;
    if (user) {
      socket.data.userId = user.id;
      socket.join(`user:${user.id}`);
    }

    socket.on('join-train', (instanceId: string) => {
      if (typeof instanceId !== 'string') return;
      socket.join(`train:${instanceId}`);
      const current = engine.get(instanceId);
      if (current) socket.emit('train-position-update', current); // send the current position immediately
    });

    // Nearest-station alerts: the phone sends only the station NAME (never coordinates).
    socket.on('watch-station', (stationName: string) => {
      if (typeof stationName !== 'string' || stationName.length > 60) return;
      if (socket.data.watchStation) socket.leave(`station:${socket.data.watchStation}`);
      socket.data.watchStation = stationName;
      socket.join(`station:${stationName}`);
    });

    // Home screen's live feed of crowd/delay changes
    socket.on('join-feed', () => socket.join('feed'));
    socket.on('leave-feed', () => socket.leave('feed'));

    socket.on('leave-train', (instanceId: string) => {
      if (typeof instanceId === 'string') socket.leave(`train:${instanceId}`);
    });
  });

  // Only clients that joined a train's room receive its position updates.
  engine.onUpdate((update) => io.to(`train:${update.instanceId}`).emit('train-position-update', update));
  return io;
}
