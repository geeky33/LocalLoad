import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { CoachMeter, ReporterList } from '../components/Crowd';
import { NearestStationCard } from '../components/NearestStationCard';
import { TrainCard } from '../components/TrainCard';
import { Button, Card, Empty, ErrorState, Loading, Pill, Row, Screen, SectionHeader, SimBadge, T } from '../components/ui';
import { LINE_COLORS, LINE_NAMES, radius, space } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAsync } from '../hooks/useAsync';
import { AppStackParamList } from '../navigation/types';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { CrowdLevel, DelayCategory, FeedItem, PositionUpdate, SavedRoute, TrainSummary } from '../types';
import { CROWD_INFO, DELAY_LABELS, greeting, timeAgo } from '../utils/format';

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [q, setQ] = useState('');

  const { data, loading, error, reload } = useAsync(async () => {
    const [routes, active, trains, feed] = await Promise.all([
      api.get<SavedRoute[]>('/routes'),
      api.get<{ trains: PositionUpdate[] }>('/tracking/active'),
      api.get<{ trains: TrainSummary[] }>('/trains'),
      api.get<{ items: FeedItem[] }>('/crowd/recent', { params: { limit: 6 } }),
    ]);
    return { routes: routes.data, active: active.data.trains, trains: trains.data.trains, feed: feed.data.items };
  });

  // Real-time: the server pings the "feed" room whenever anyone reports; refresh (debounced).
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit('join-feed');
    const onUpdate = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => reload(true), 1200);
    };
    if (socket.connected) join();
    socket.on('connect', join);
    socket.on('feed-update', onUpdate);
    return () => {
      socket.emit('leave-feed');
      socket.off('connect', join);
      socket.off('feed-update', onUpdate);
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [reload]);

  // Re-render every 10 s so "x min ago" stays current between updates.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload(true);
      const t = setInterval(() => reload(true), 15000); // keep running-train list fresh
      return () => clearInterval(t);
    }, [reload]),
  );

  const track = (instanceId: string | null, trainId: string, name?: string) => instanceId && nav.navigate('Tracking', { instanceId, trainId, name });
  const firstName = user?.name.split(' ')[0] ?? '';
  const delayAlerts = (data?.trains ?? []).filter((t) => t.delay?.state === 'confirmed' && t.delay.value !== 'on-time');

  return (
    <Screen refreshControl={<RefreshControl refreshing={false} onRefresh={() => reload()} />}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T variant="small">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</T>
          <T variant="title">
            {greeting()}, {firstName}
          </T>
        </View>
        <Pressable onPress={() => nav.navigate('Notifications')} hitSlop={10} style={{ padding: 8, borderRadius: radius.pill, backgroundColor: colors.card }}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
        </Pressable>
      </Row>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.md, height: 48 }}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search trains by name or number"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          onSubmitEditing={() => nav.navigate('Tabs', { screen: 'Track', params: { q } })}
          style={{ flex: 1, color: colors.text, fontSize: 16 }}
        />
      </View>

      <Row style={{ gap: space.sm }}>
        <Button title="Track a Train" icon="navigate" onPress={() => nav.navigate('Tabs', { screen: 'Track' })} style={{ flex: 1 }} />
        <Button title="Report" icon="megaphone-outline" variant="secondary" onPress={() => nav.navigate('Tabs', { screen: 'Report' })} />
      </Row>

      <NearestStationCard onTrainsFrom={(name) => nav.navigate('Tabs', { screen: 'Track', params: { from: name } })} />

      {loading && !data ? (
        <Loading />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <SectionHeader title="Your daily routes" action="+ Add" onAction={() => nav.navigate('RouteForm')} />
          {data!.routes.length === 0 ? (
            <Card onPress={() => nav.navigate('RouteForm')} style={{ alignItems: 'center', gap: space.sm, borderStyle: 'dashed' }}>
              <Ionicons name="map-outline" size={28} color={colors.primary} />
              <T style={{ fontWeight: '600' }}>Add your daily route to get started.</T>
              <T variant="small">We'll show matching trains and alert you about confirmed crowd and delay changes.</T>
            </Card>
          ) : (
            data!.routes.map((r) => (
              <Card key={r._id} style={{ gap: space.sm }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row style={{ gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: LINE_COLORS[r.line] }} />
                    <T variant="h3">{r.name}</T>
                  </Row>
                  <T variant="small">
                    {r.preferredTime} · {r.preference === 'any' ? 'Any' : r.preference}
                  </T>
                </Row>
                <T variant="small">
                  {r.source.name} → {r.destination.name} · {LINE_NAMES[r.line]}
                </T>
                {r.trains.length === 0 ? (
                  <T variant="small">No demo trains run on this route.</T>
                ) : (
                  r.trains.slice(0, 2).map((t) => <TrainCard key={t._id} compact train={t} onTrack={() => track(t.instanceId, t._id, t.name)} />)
                )}
              </Card>
            ))
          )}

          <SectionHeader title="Running now" />
          <Row style={{ gap: 6 }}>
            <SimBadge text="SIMULATED POSITIONS" />
          </Row>
          {data!.active.length === 0 ? (
            <Empty icon="train-outline" text="No simulated trains are running. Ask the admin to start the simulation." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {data!.active.map((p) => (
                <Card key={p.instanceId} onPress={() => track(p.instanceId, p.trainId, p.name)} style={{ width: 200, gap: 6, padding: space.md }}>
                  <Row style={{ gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: LINE_COLORS[p.line] }} />
                    <T variant="h3">{p.number}</T>
                    <T variant="small">{p.type}</T>
                  </Row>
                  <T variant="small" numberOfLines={1}>
                    {p.name}
                  </T>
                  <T numberOfLines={1} style={{ fontWeight: '600' }}>
                    {p.status === 'completed' ? `Arrived ${p.previousStation.name}` : p.status === 'at-station' ? `At ${p.previousStation.name}` : `→ ${p.nextStation?.name}`}
                  </T>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.neutralSoft }}>
                    <View style={{ width: `${Math.round(p.journeyProgress * 100)}%`, height: 4, borderRadius: 2, backgroundColor: LINE_COLORS[p.line] }} />
                  </View>
                </Card>
              ))}
            </ScrollView>
          )}

          {delayAlerts.length > 0 && (
            <>
              <SectionHeader title="Delay alerts" />
              {delayAlerts.map((t) => (
                <Card key={t._id} onPress={() => track(t.instanceId, t._id, t.name)} style={{ borderLeftWidth: 4, borderLeftColor: colors.danger }}>
                  <T style={{ fontWeight: '700' }}>
                    {t.number} · {DELAY_LABELS[t.delay!.value as DelayCategory]}
                  </T>
                  <T variant="small">
                    Confirmed by {t.delay!.total} commuters at {t.delay!.station.name} · {timeAgo(t.delay!.lastUpdated)}
                  </T>
                </Card>
              ))}
            </>
          )}

          <SectionHeader title="Recent crowd updates" />
          <Row style={{ gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.crowd.green }} />
            <T variant="small">Live · reports from the last 10 minutes, updated as commuters report</T>
          </Row>
          {data!.feed.length === 0 ? (
            <Empty icon="people-outline" text="No crowd reports in the last 10 minutes yet. Be the first — tap Report." />
          ) : (
            data!.feed.map((f) => {
              const lvl = f.state === 'confirmed' ? (f.value as CrowdLevel) : null;
              const label = lvl ? `${CROWD_INFO[lvl].label} · verified` : f.state === 'mixed' ? 'Mixed reports — no clear consensus' : `Unverified · ${f.total}/${f.threshold} reports`;
              return (
                <Card key={`${f.instanceId}-${f.station._id}`} onPress={() => track(f.instanceId, f.train._id, f.train.name)} style={{ gap: space.sm }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Row style={{ gap: 6 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: LINE_COLORS[f.train.line] }} />
                        <T style={{ fontWeight: '700' }} numberOfLines={1}>
                          {f.train.number} at {f.station.name}
                        </T>
                      </Row>
                      <T variant="small" numberOfLines={1}>
                        {f.train.name}
                      </T>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <CoachMeter level={lvl} />
                      {!lvl && <Pill text={f.state === 'mixed' ? 'MIXED' : 'UNVERIFIED'} color={colors.muted} bg={colors.neutralSoft} />}
                    </View>
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T variant="small" color={lvl ? colors.crowd[lvl] : colors.muted} style={{ fontWeight: '700' }}>
                      {label}
                    </T>
                    <T variant="small">{timeAgo(f.lastUpdated)}</T>
                  </Row>
                  <ReporterList reporters={f.reporters} max={6} />
                </Card>
              );
            })
          )}
          <T variant="small">Names marked “demo” are simulated commuters reporting for the demonstration.</T>
        </>
      )}
    </Screen>
  );
}
