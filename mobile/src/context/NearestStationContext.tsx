import React, { createContext, useContext, useEffect } from 'react';
import { useNearestStation } from '../hooks/useNearestStation';
import { getSocket } from '../services/socket';

type Value = ReturnType<typeof useNearestStation>;
const NearestStationContext = createContext<Value | null>(null);

/**
 * Finds the user's nearest station once (shared by the Home card and alerts) and tells the
 * server its NAME over Socket.IO ("watch-station"), so the server can alert us when a
 * less-crowded train arrives there. Coordinates never leave the phone.
 */
export function NearestStationProvider({ children }: { children: React.ReactNode }) {
  const value = useNearestStation();
  const stationName = value.status === 'ready' ? (value.nearest[0]?.name ?? null) : null;

  useEffect(() => {
    if (!stationName) return;
    const socket = getSocket();
    const watch = () => socket.emit('watch-station', stationName);
    if (socket.connected) watch();
    socket.on('connect', watch); // re-send after reconnects / login
    return () => {
      socket.off('connect', watch);
    };
  }, [stationName]);

  return <NearestStationContext.Provider value={value}>{children}</NearestStationContext.Provider>;
}

export function useNearest() {
  const ctx = useContext(NearestStationContext);
  if (!ctx) throw new Error('useNearest must be used inside NearestStationProvider');
  return ctx;
}
