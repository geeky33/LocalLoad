import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CrowdStatusCard, DelayPill } from '../components/Crowd';
import { Button, Card, ErrorState, Loading, Pill, Row, SimBadge, T } from '../components/ui';
import { LINE_COLORS, LINE_NAMES, radius, space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAsync } from '../hooks/useAsync';
import { useSmoothCoord } from '../hooks/useSmoothCoord';
import { useTrainTracking } from '../hooks/useTrainTracking';
import { AppStackParamList } from '../navigation/types';
import { api } from '../services/api';
import { InstanceStatus, PositionUpdate, RouteStop } from '../types';
import { clock } from '../utils/format';

type Props = NativeStackScreenProps<AppStackParamList, 'Tracking'>;

export default function TrackingScreen({ route }: Props) {
  const { instanceId, trainId, name } = route.params;
  const { colors, isDark } = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const map = useRef<MapView>(null);
  const [showMe, setShowMe] = useState(false);

  // Show the user's own position on the map only if they already allowed location (no prompt here).
  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then((p) => setShowMe(p.granted))
      .catch(() => {});
  }, []);

  // Initial snapshot over REST, then live updates over Socket.IO.
  const initial = useAsync(async () => {
    const [track, status] = await Promise.all([
      api.get<{ position: PositionUpdate; route: RouteStop[] }>(`/tracking/${instanceId}`),
      api.get<{ crowd: InstanceStatus; delay: InstanceStatus }>(`/trains/${trainId}/status`),
    ]);
    return { ...track.data, ...status.data };
  }, [instanceId]);

  const live = useTrainTracking(instanceId);
  const position = live.position ?? initial.data?.position ?? null;
  const crowd = live.crowd ?? initial.data?.crowd ?? null;
  const delay = live.delay ?? initial.data?.delay ?? null;
  const stops = initial.data?.route ?? [];
  const lineColor = position ? LINE_COLORS[position.line] : colors.primary;

  const target = useMemo(
    () => (position ? { latitude: position.position.lat, longitude: position.position.lng } : null),
    [position?.position.lat, position?.position.lng],
  );
  const trainCoord = useSmoothCoord(target);

  // Fit the whole route on first load.
  useEffect(() => {
    if (stops.length > 1) {
      setTimeout(
        () =>
          map.current?.fitToCoordinates(
            stops.map((s) => ({ latitude: s.lat, longitude: s.lng })),
            { edgePadding: { top: 60, right: 40, bottom: 60, left: 40 }, animated: false },
          ),
        300,
      );
    }
  }, [stops.length]);

  const centerOnTrain = () => target && map.current?.animateToRegion({ ...target, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 500);

  if (initial.loading && !initial.data) return <Loading text="Loading simulated train…" />;
  if (initial.error && !initial.data) return <ErrorState message={initial.error} onRetry={initial.reload} />;

  const p = position!;
  const statusLine =
    p.status === 'completed'
      ? `Arrived at ${p.previousStation.name}`
      : p.status === 'at-station'
        ? `Halted at ${p.previousStation.name}`
        : `Between ${p.previousStation.name} and ${p.nextStation?.name}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        showsPointsOfInterests={false}
        showsUserLocation={showMe}
        initialRegion={{ latitude: p.position.lat, longitude: p.position.lng, latitudeDelta: 0.25, longitudeDelta: 0.25 }}
      >
        <Polyline coordinates={stops.map((s) => ({ latitude: s.lat, longitude: s.lng }))} strokeColor={lineColor} strokeWidth={5} />
        {stops.map((s, i) => {
          const passed = i <= stops.findIndex((x) => x.id === p.previousStation.id);
          return (
            <Marker key={`${s.id}-${passed}`} coordinate={{ latitude: s.lat, longitude: s.lng }} title={s.name} description={s.code} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={[styles.stationDot, { borderColor: lineColor, backgroundColor: passed ? lineColor : '#fff' }]} />
            </Marker>
          );
        })}
        {trainCoord && (
          <Marker coordinate={trainCoord} anchor={{ x: 0.5, y: 0.5 }} title={`${p.number} (simulated)`} zIndex={10}>
            <View style={[styles.trainMarker, { backgroundColor: lineColor }]}>
              <Ionicons name="train" size={18} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Top: train identity */}
      <SafeAreaView edges={['top']} style={{ paddingHorizontal: space.md }} pointerEvents="box-none">
        <Card style={{ padding: space.md, gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Pressable onPress={() => nav.goBack()} hitSlop={10}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <T variant="h3" numberOfLines={1}>
                {p.name ?? name}
              </T>
              <T variant="small">
                #{p.number} · {LINE_NAMES[p.line]} · {p.type === 'fast' ? 'Fast' : 'Slow'} · {p.direction === 'up' ? 'Up ↑' : 'Down ↓'}
              </T>
            </View>
            <View style={[styles.liveDot, { backgroundColor: live.connected ? colors.crowd.green : colors.muted }]} />
          </Row>
          <Row style={{ gap: 6, flexWrap: 'wrap' }}>
            <SimBadge text="SIMULATED LIVE TRACKING" />
            <DelayPill verdict={delay?.summary ?? null} />
          </Row>
        </Card>
      </SafeAreaView>

      <Pressable onPress={centerOnTrain} style={[styles.fab, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="locate" size={22} color={colors.primary} />
      </Pressable>

      {/* Bottom panel: position details */}
      <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
          <T variant="h3">{statusLine}</T>

          {/* Progress strip: previous station ● ──🚆── ● next station */}
          <Row style={{ gap: 8 }}>
            <View style={[styles.stripDot, { backgroundColor: lineColor }]} />
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.neutralSoft }}>
              <View
                style={{
                  width: `${p.nextStation && p.distanceToNextKm !== null ? Math.round(stripProgress(p) * 100) : 100}%`,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: lineColor,
                }}
              />
            </View>
            <View style={[styles.stripDot, { backgroundColor: p.nextStation ? colors.neutralSoft : lineColor, borderColor: lineColor, borderWidth: 2 }]} />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="small">{p.previousStation.name}</T>
            <T variant="small">{p.nextStation?.name ?? 'Terminus'}</T>
          </Row>

          <Row style={{ gap: space.sm }}>
            <Stat label="Next station" value={p.nextStation?.name ?? '—'} />
            <Stat label="ETA" value={p.etaMinutes !== null ? `~${p.etaMinutes} min` : '—'} />
          </Row>
          <Row style={{ gap: space.sm }}>
            <Stat label="Speed" value={`${p.speedKmph} km/h`} />
            <Stat label="Distance" value={p.distanceToNextKm !== null ? `${p.distanceToNextKm.toFixed(1)} km` : '—'} />
            <Stat label="Updated" value={clock(p.lastUpdated)} />
          </Row>

          <Row style={{ gap: 6 }}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <T variant="small">
              Simulated location {p.position.lat.toFixed(4)}°N, {p.position.lng.toFixed(4)}°E · {Math.round(p.journeyProgress * 100)}% of journey
            </T>
          </Row>

          <CrowdStatusCard verdict={crowd?.summary ?? null} title="Crowd (community verified)" />

          <Button
            title="Report crowd or delay"
            icon="megaphone-outline"
            onPress={() => nav.navigate('Tabs', { screen: 'Report', params: { instanceId, trainId, stationId: (p.nextStation ?? p.previousStation).id } })}
          />
          <Pill text="Train positions are simulated for demonstration purposes." color={colors.muted} bg={colors.neutralSoft} icon="information-circle-outline" />
          <T variant="small">ETA uses simulated time (demo runs faster than real life). Community delay reports are shown separately above.</T>
        </ScrollView>
      </View>
    </View>
  );
}

/** Progress (0..1) along the current segment, derived from ETA distance. */
function stripProgress(p: PositionUpdate) {
  if (p.status !== 'running') return 0;
  const seg = haversine(p.previousStation, p.nextStation!);
  return seg > 0 ? Math.max(0, Math.min(1, 1 - (p.distanceToNextKm ?? 0) / seg)) : 0;
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
      <T variant="label">{label}</T>
      <T style={{ fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  stationDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  trainMarker: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  liveDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  fab: { position: 'absolute', right: space.lg, top: '42%', width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '48%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: StyleSheet.hairlineWidth },
  stripDot: { width: 14, height: 14, borderRadius: 7 },
});
