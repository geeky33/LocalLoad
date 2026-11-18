import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PickerStation, StationPicker } from '../components/StationPicker';
import { TrainCard } from '../components/TrainCard';
import { Chips, Empty, ErrorState, Loading, Row, SimBadge, T } from '../components/ui';
import { LINE_COLORS, radius, space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAsync } from '../hooks/useAsync';
import { AppStackParamList, TabParamList } from '../navigation/types';
import { api } from '../services/api';
import { Station, TrainSummary } from '../types';

type All<T extends string> = T | 'all';

export default function TrackScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<TabParamList, 'Track'>>();

  const [q, setQ] = useState(route.params?.q ?? '');
  const [debounced, setDebounced] = useState(q);
  const [line, setLine] = useState<All<'western' | 'central' | 'harbour'>>('all');
  const [type, setType] = useState<All<'fast' | 'slow'>>('all');
  const [direction, setDirection] = useState<All<'up' | 'down'>>('all');
  const [from, setFrom] = useState<PickerStation | null>(null);
  const [to, setTo] = useState<PickerStation | null>(null);

  useEffect(() => {
    if (route.params?.q !== undefined) setQ(route.params.q);
  }, [route.params?.q]);
  // "Trains from <nearest station>" on Home pre-fills the From field.
  useEffect(() => {
    if (route.params?.from) {
      setFrom({ _id: `near-${route.params.from}`, name: route.params.from });
      setTo(null);
      setLine('all');
    }
  }, [route.params?.from]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const stationsReq = useAsync(() => api.get<Station[]>('/stations').then((r) => r.data));
  // Unique station names (search matches by name, so interchange stations work across lines).
  const pickerStations = useMemo(() => {
    const seen = new Set<string>();
    return (stationsReq.data ?? [])
      .filter((s) => line === 'all' || s.line === line)
      .filter((s) => (seen.has(s.name) ? false : (seen.add(s.name), true)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [stationsReq.data, line]);

  const { data, loading, error, reload } = useAsync(
    () =>
      api
        .get<{ trains: TrainSummary[] }>('/trains/search', {
          params: {
            q: debounced || undefined,
            line: line === 'all' ? undefined : line,
            type: type === 'all' ? undefined : type,
            direction: direction === 'all' ? undefined : direction,
            from: from?.name,
            to: to?.name,
          },
        })
        .then((r) => r.data.trains),
    [debounced, line, type, direction, from?.name, to?.name],
  );

  const header = (
    <View style={{ gap: space.md, paddingBottom: space.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="title">Track</T>
        <SimBadge text="SIMULATED TRAIN TIMETABLE" />
      </Row>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.md, height: 46 }}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Train name or number (e.g. 90101)" placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.text, fontSize: 16 }} />
      </View>
      <Row style={{ gap: space.sm }}>
        <StationPicker label="From" value={from} stations={pickerStations} onChange={setFrom} />
        <Ionicons
          name="swap-horizontal"
          size={22}
          color={colors.primary}
          onPress={() => {
            setFrom(to);
            setTo(from);
          }}
        />
        <StationPicker label="To" value={to} stations={pickerStations} onChange={setTo} />
      </Row>
      <Chips
        value={line}
        onChange={setLine}
        color={(v) => (v === 'all' ? undefined : LINE_COLORS[v])}
        options={[
          { value: 'all', label: 'All lines' },
          { value: 'western', label: 'Western' },
          { value: 'central', label: 'Central' },
          { value: 'harbour', label: 'Harbour' },
        ]}
      />
      <Row style={{ gap: space.sm }}>
        <Chips value={type} onChange={setType} options={[{ value: 'all', label: 'Fast + Slow' }, { value: 'fast', label: 'Fast' }, { value: 'slow', label: 'Slow' }]} />
      </Row>
      <Chips value={direction} onChange={setDirection} options={[{ value: 'all', label: 'Both directions' }, { value: 'up', label: 'Up (to city)' }, { value: 'down', label: 'Down (from city)' }]} />
      {data && <T variant="small">{data.length} trains · demo schedule, not official railway times</T>}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <FlatList
        data={error ? [] : (data ?? [])}
        keyExtractor={(t) => t._id}
        contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 40 }}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => reload()} />}
        ListEmptyComponent={
          loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : <Empty icon="train-outline" text="No trains match these filters. Try another station pair or direction." />
        }
        renderItem={({ item }) => (
          <TrainCard train={item} onTrack={() => item.instanceId && nav.navigate('Tracking', { instanceId: item.instanceId, trainId: item._id, name: item.name })} />
        )}
      />
    </SafeAreaView>
  );
}
