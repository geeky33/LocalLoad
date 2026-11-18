import type { Server } from 'socket.io';
import type { CommuterSimulator } from '../simulation/commuters';
import type { SimulationEngine } from '../simulation/engine';

/** Holds the single Socket.IO server and simulation engine created at startup. */
export const runtime: { io: Server | null; engine: SimulationEngine | null; commuters: CommuterSimulator | null } = {
  io: null,
  engine: null,
  commuters: null,
};

export function engine() {
  if (!runtime.engine) throw new Error('Simulation engine not initialised');
  return runtime.engine;
}
