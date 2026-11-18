import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { StationPicker } from '../components/StationPicker';
import { Button, Chips, ErrorState, Field, Loading, Row, Screen, T } from '../components/ui';
import { LINE_COLORS, space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAsync } from '../hooks/useAsync';
import { AppStackParamList } from '../navigation/types';
import { api, errorMessage } from '../services/api';
import { Line, Station } from '../types';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function RouteFormScreen({ route, navigation }: NativeStackScreenProps<AppStackParamList, 'RouteForm'>) {
  const editing = route.params?.route;
  const { colors } = useTheme();
  const [name, setName] = useState(editing?.name ?? '');
  const [line, setLine] = useState<Line>(editing?.line ?? 'western');
  const [source, setSource] = useState<Station | null>(editing?.source ?? null);
  const [destination, setDestination] = useState<Station | null>(editing?.destination ?? null);
  const [time, setTime] = useState(editing?.preferredTime ?? '08:30');
  const [preference, setPreference] = useState<'any' | 'fast' | 'slow'>(editing?.preference ?? 'any');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const stations = useAsync(() => api.get<Station[]>('/stations').then((r) => r.data));
  const lineStations = useMemo(() => (stations.data ?? []).filter((s) => s.line === line), [stations.data, line]);

  const save = async () => {
    if (!name.trim()) return setError('Give your route a name');
    if (!source || !destination) return setError('Choose both stations');
    if (source._id === destination._id) return setError('Source and destination must differ');
    if (!HHMM.test(time)) return setError('Time must be HH:mm (24-hour), e.g. 08:30');
    setBusy(true);
    setError(null);
    const body = { name: name.trim(), sourceId: source._id, destinationId: destination._id, preferredTime: time, line, preference };
    try {
      if (editing) await api.put(`/routes/${editing._id}`, body);
      else await api.post('/routes', body);
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = () =>
    Alert.alert('Delete route?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/routes/${editing!._id}`).catch(() => {});
          navigation.goBack();
        },
      },
    ]);

  if (stations.loading) return <Loading />;
  if (stations.error) return <ErrorState message={stations.error} onRetry={stations.reload} />;

  return (
    <Screen edges={['bottom']}>
      <Field label="Route name" value={name} onChangeText={setName} placeholder="Home → Office" icon="bookmark-outline" />
      <T variant="label">Railway line</T>
      <Chips
        value={line}
        onChange={(l) => {
          setLine(l);
          setSource(null);
          setDestination(null);
        }}
        color={(l) => LINE_COLORS[l]}
        options={[
          { value: 'western', label: 'Western' },
          { value: 'central', label: 'Central' },
          { value: 'harbour', label: 'Harbour' },
        ]}
      />
      <Row style={{ gap: space.sm }}>
        <StationPicker label="From" value={source} stations={lineStations} onChange={(s) => setSource(s as Station | null)} placeholder="Choose" />
        <StationPicker label="To" value={destination} stations={lineStations} onChange={(s) => setDestination(s as Station | null)} placeholder="Choose" />
      </Row>
      <Field label="Preferred departure (24h)" value={time} onChangeText={setTime} placeholder="08:30" keyboardType="numbers-and-punctuation" icon="time-outline" />
      <T variant="label">Train preference</T>
      <Chips value={preference} onChange={setPreference} options={[{ value: 'any', label: 'Any' }, { value: 'fast', label: 'Fast' }, { value: 'slow', label: 'Slow' }]} />
      {error && <T color={colors.danger}>{error}</T>}
      <Button title={editing ? 'Save changes' : 'Save route'} onPress={save} loading={busy} icon="checkmark" />
      {editing && <Button title="Delete route" variant="danger" onPress={remove} icon="trash-outline" />}
    </Screen>
  );
}
