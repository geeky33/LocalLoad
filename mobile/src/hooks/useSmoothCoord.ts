import { useEffect, useRef, useState } from 'react';

type Coord = { latitude: number; longitude: number };

/**
 * Visual smoothing only: glides the marker from its old position to the new
 * server position over `duration` ms instead of jumping. The server stays the source of truth.
 */
export function useSmoothCoord(target: Coord | null, duration = 900) {
  const [coord, setCoord] = useState<Coord | null>(target);
  const current = useRef<Coord | null>(target);

  useEffect(() => {
    if (!target) return;
    const start = current.current;
    // Big jumps (a train restarting its demo loop) snap instead of gliding across the map.
    const far = start && Math.abs(start.latitude - target.latitude) + Math.abs(start.longitude - target.longitude) > 0.03;
    if (!start || far) {
      current.current = target;
      setCoord(target);
      return;
    }
    const t0 = Date.now();
    const timer = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / duration);
      const next = {
        latitude: start.latitude + (target.latitude - start.latitude) * k,
        longitude: start.longitude + (target.longitude - start.longitude) * k,
      };
      current.current = next;
      setCoord(next);
      if (k >= 1) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [target?.latitude, target?.longitude, duration]);

  return coord;
}
