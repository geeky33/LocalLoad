import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { LINE_COLORS, LINE_NAMES, space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useNearest } from '../context/NearestStationContext';
import { Button, Card, Row, T } from './ui';

const fmtDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

/** "You are near ___ station" card on the Home screen. */
export function NearestStationCard({ onTrainsFrom }: { onTrainsFrom: (stationName: string) => void }) {
  const { colors } = useTheme();
  const { status, nearest, outOfArea, canAskAgain, error, locate } = useNearest();
  const top = nearest[0];

  if (status === 'loading') {
    return (
      <Card>
        <Row style={{ gap: space.sm }}>
          <ActivityIndicator color={colors.primary} />
          <T variant="small">Finding the station nearest to you…</T>
        </Row>
      </Card>
    );
  }

  if (status !== 'ready' || !top) {
    const message =
      status === 'denied'
        ? 'Allow location access to see the station nearest to you.'
        : status === 'services-off'
          ? 'Location services are turned off. Turn them on in Settings to find your nearest station.'
          : `Couldn't find your location. ${error ?? ''}`;
    return (
      <Card style={{ gap: space.sm }}>
        <Row style={{ gap: space.sm }}>
          <Ionicons name="location-outline" size={20} color={colors.muted} />
          <T variant="small" style={{ flex: 1 }}>
            {message}
          </T>
        </Row>
        <Button
          title={status === 'denied' && !canAskAgain ? 'Open Settings' : status === 'denied' ? 'Allow location' : 'Try again'}
          variant="secondary"
          icon="locate"
          onPress={() => (status === 'denied' && !canAskAgain ? Linking.openSettings() : locate())}
        />
      </Card>
    );
  }

  return (
    <Card style={{ gap: space.sm, borderLeftWidth: 4, borderLeftColor: colors.primary }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: 6 }}>
          <Ionicons name="location" size={16} color={colors.primary} />
          <T variant="label">Nearest station to you</T>
        </Row>
        <Pressable onPress={locate} hitSlop={10}>
          <Ionicons name="refresh" size={18} color={colors.primary} />
        </Pressable>
      </Row>

      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T variant="h2">{top.name}</T>
          <Row style={{ gap: space.sm, marginTop: 2, flexWrap: 'wrap' }}>
            {top.lines.map((l) => (
              <Row key={l} style={{ gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: LINE_COLORS[l] }} />
                <T variant="small">{LINE_NAMES[l]}</T>
              </Row>
            ))}
          </Row>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T variant="h3">{fmtDistance(top.distanceKm)}</T>
          {!outOfArea && <T variant="small">~{Math.max(1, top.walkMinutes)} min walk</T>}
        </View>
      </Row>

      {outOfArea ? (
        <T variant="small" color={colors.danger}>
          You seem to be outside Mumbai. LocalLoad covers Mumbai suburban stations, so this is the closest one we know.
        </T>
      ) : (
        nearest.length > 1 && (
          <T variant="small">
            Also nearby: {nearest.slice(1).map((s) => `${s.name} (${fmtDistance(s.distanceKm)})`).join(', ')}
          </T>
        )
      )}

      <Row style={{ gap: 6 }}>
        <Ionicons name="notifications-outline" size={14} color={colors.primary} />
        <T variant="small" style={{ flex: 1 }}>
          You'll get an alert when a train with a verified green or yellow crowd reaches {top.name}.
        </T>
      </Row>
      <Button title={`Trains from ${top.name}`} icon="train-outline" variant="secondary" onPress={() => onTrainsFrom(top.name)} />
      <T variant="small">Straight-line distance. Your location stays on your phone and is not saved.</T>
    </Card>
  );
}
