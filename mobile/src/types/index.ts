export type Line = 'western' | 'central' | 'harbour';
export type CrowdLevel = 'green' | 'yellow' | 'red';
export type DelayCategory = 'on-time' | '1-5' | '5-10' | '10-plus' | 'not-arrived' | 'cancelled';
export type VerdictState = 'none' | 'unverified' | 'confirmed' | 'mixed';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  points: number;
  notificationSettings: { enabled: boolean; crowd: boolean; delay: boolean; nearby?: boolean };
}

export interface Station {
  _id: string;
  name: string;
  code: string;
  line: Line;
  lat: number;
  lng: number;
  sequence: number;
}

export interface StationTime {
  _id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  time: string;
}

export interface Reporter {
  name: string;
  demo: boolean; // simulated demo commuter
  value: string;
  reportedAt: string;
}

export interface FeedItem extends Verdict {
  instanceId: string;
  train: { _id: string; number: string; name: string; line: Line; type: 'fast' | 'slow'; direction: 'up' | 'down' };
}

export interface Verdict {
  state: VerdictState;
  value: string | null;
  total: number;
  threshold: number;
  distribution: Record<string, number>;
  lastUpdated: string | null;
  message: string;
  station: { _id: string; name: string; code: string };
  reporters?: Reporter[];
}

export interface TrainSummary {
  _id: string;
  number: string;
  name: string;
  line: Line;
  type: 'fast' | 'slow';
  direction: 'up' | 'down';
  source: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMin: number;
  haltCount: number;
  boardAt: StationTime | null;
  alightAt: StationTime | null;
  instanceId: string | null;
  crowd: Verdict | null;
  delay: Verdict | null;
}

export interface TrainDetail {
  _id: string;
  number: string;
  name: string;
  line: Line;
  type: 'fast' | 'slow';
  direction: 'up' | 'down';
  departureTime: string;
  durationMin: number;
  stations: StationTime[];
  instanceId: string | null;
}

export interface RouteStop {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
}

export interface PositionUpdate {
  instanceId: string;
  trainId: string;
  number: string;
  name: string;
  line: Line;
  type: string;
  direction: string;
  status: 'running' | 'at-station' | 'completed';
  position: { lat: number; lng: number };
  currentStation: RouteStop | null;
  previousStation: RouteStop;
  nextStation: RouteStop | null;
  distanceToNextKm: number | null;
  etaMinutes: number | null;
  speedKmph: number;
  journeyProgress: number;
  lastUpdated: string;
  simulated: true;
}

export interface InstanceStatus {
  trainInstanceId: string;
  kind: 'crowd' | 'delay';
  summary: Verdict | null;
  stations: Verdict[];
}

export interface SavedRoute {
  _id: string;
  name: string;
  source: Station;
  destination: Station;
  preferredTime: string;
  line: Line;
  preference: 'fast' | 'slow' | 'any';
  trains: TrainSummary[];
}

export interface AppNotification {
  _id: string;
  type: 'crowd' | 'delay' | 'nearby' | 'info';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface NearbyStation {
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  walkMinutes: number;
  lines: Line[];
  stations: { _id: string; line: Line; code: string }[];
}
