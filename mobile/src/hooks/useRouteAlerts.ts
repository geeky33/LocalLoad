import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { showLocalNotification } from '../services/notifications';
import { getSocket } from '../services/socket';

/** Listens for confirmed route alerts from the server and shows them as local notifications. */
export function useRouteAlerts() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const onAlert = (a: { title: string; body: string }) => {
      if (user.notificationSettings?.enabled !== false) showLocalNotification(a.title, a.body);
    };
    socket.on('route-alert', onAlert);
    return () => {
      socket.off('route-alert', onAlert);
    };
  }, [user]);
}
