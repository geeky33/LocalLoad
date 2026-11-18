import { useEffect, useState } from 'react';
import { getSocket } from '../services/socket';
import { InstanceStatus, PositionUpdate } from '../types';

/**
 * Subscribes to one simulated train over Socket.IO:
 * join-train on mount, leave-train + listener cleanup on unmount.
 */
export function useTrainTracking(instanceId: string | null) {
  const [position, setPosition] = useState<PositionUpdate | null>(null);
  const [crowd, setCrowd] = useState<InstanceStatus | null>(null);
  const [delay, setDelay] = useState<InstanceStatus | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!instanceId) return;
    const socket = getSocket();
    const join = () => {
      setConnected(true);
      socket.emit('join-train', instanceId);
    };
    const onDisconnect = () => setConnected(false);
    const onPosition = (u: PositionUpdate) => u.instanceId === instanceId && setPosition(u);
    const onCrowd = (s: InstanceStatus) => s.trainInstanceId === instanceId && setCrowd(s);
    const onDelay = (s: InstanceStatus) => s.trainInstanceId === instanceId && setDelay(s);

    if (socket.connected) join();
    socket.on('connect', join); // re-join after reconnects
    socket.on('disconnect', onDisconnect);
    socket.on('train-position-update', onPosition);
    socket.on('crowd-status-update', onCrowd);
    socket.on('delay-status-update', onDelay);

    return () => {
      socket.emit('leave-train', instanceId);
      socket.off('connect', join);
      socket.off('disconnect', onDisconnect);
      socket.off('train-position-update', onPosition);
      socket.off('crowd-status-update', onCrowd);
      socket.off('delay-status-update', onDelay);
    };
  }, [instanceId]);

  return { position, setPosition, crowd, setCrowd, delay, setDelay, connected };
}
