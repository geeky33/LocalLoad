import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../services/api';
import { NearbyStation } from '../types';

type Status = 'loading' | 'ready' | 'denied' | 'services-off' | 'error';

/**
 * Reads the phone's current location (foreground only, with permission) and asks the
 * server for the nearest stations. The location is not stored anywhere.
 */
export function useNearestStation() {
  const [status, setStatus] = useState<Status>('loading');
  const [nearest, setNearest] = useState<NearbyStation[]>([]);
  const [outOfArea, setOutOfArea] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      setCanAskAgain(perm.canAskAgain);
      if (perm.status !== 'granted') return setStatus('denied');
      if (!(await Location.hasServicesEnabledAsync())) return setStatus('services-off');

      // A recent cached fix is instant; otherwise ask for a fresh one.
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 60_000, requiredAccuracy: 200 })) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));

      const { data } = await api.get<{ nearest: NearbyStation[]; outOfArea: boolean }>('/stations/nearest', {
        params: { lat: pos.coords.latitude, lng: pos.coords.longitude, limit: 3 },
      });
      setNearest(data.nearest);
      setOutOfArea(data.outOfArea);
      setStatus('ready');
    } catch (e) {
      setError(errorMessage(e));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  return { status, nearest, outOfArea, canAskAgain, error, locate };
}
