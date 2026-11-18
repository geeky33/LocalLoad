import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { CoachMeter, CrowdStatusCard } from '../components/Crowd';
import { StationPicker } from '../components/StationPicker';
import { Button, Card, Chips, ErrorState, Loading, Row, Screen, SimBadge, T } from '../components/ui';
import { LINE_COLORS, radius, space } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAsync } from '../hooks/useAsync';
import { TabParamList } from '../navigation/types';
import { api, errorMessage } from '../services/api';
import { CrowdLevel, DelayCategory, PositionUpdate, StationTime, TrainDetail, Verdict } from '../types';
import { CROWD_INFO, DELAY_LABELS, DELAY_OPTIONS } from '../utils/format';

type Mode = 'crowd' | 'delay';

export default function ReportScreen() {
  const { colors } = useTheme();
  const { refresh } = useAuth();
  const params = useRoute<RouteProp<TabParamList, 'Report'>>().params;

  const [instanceId, setInstanceId] = useState<string | null>(params?.instanceId ?? null);
  const [station, setStation] = useState<StationTime | null>(null);
  const [mode, setMode] = useState<Mode>('crowd');
  const [level, setLevel] = useState<CrowdLevel | null>(null);
  const [category, setCategory] = useState<DelayCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; verdict?: Verdict } | null>(null);

  // Running trains to pick from
  const active = useAsync(() => api.get<{ trains: PositionUpdate[] }>('/tracking/active').then((r) => r.data.trains));
  useFocusEffect(useCallback(() => void active.reload(true), [active.reload]));

  // Pre-select from navigation params (e.g. "Report" button on the tracking screen)
  useEffect(() => {
    if (params?.instanceId) setInstanceId(params.instanceId);
  }, [params?.instanceId]);

  const selected = active.data?.find((t) => t.instanceId === instanceId) ?? null;
  const detail = useAsync(
    () => (selected ? api.get<TrainDetail>(`/trains/${selected.trainId}`).then((r) => r.data) : Promise.resolve(null)),
    [selected?.trainId],
  );

  // Default station: the one requested, else the train's next / current halt.
  useEffect(() => {
    if (!detail.data || !selected) return;
    const wanted = params?.stationId ?? (selected.nextStation ?? selected.previousStation).id;
    setStation(detail.data.stations.find((s) => s._id === wanted) ?? detail.data.stations[0]);
    setResult(null);
  }, [detail.data?._id]);

  const canSubmit = !!instanceId && !!station && (mode === 'crowd' ? !!level : !!category);

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setResult(null);
    try {
      const body = { trainInstanceId: instanceId, stationId: station!._id, ...(mode === 'crowd' ? { level } : { category }) };
      const { data } = await api.post(`/reports/${mode}`, body);
      setResult({ ok: true, message: data.message, verdict: { ...data.verdict, station: { _id: station!._id, name: station!.name, code: station!.code } } });
      refresh().catch(() => {});
    } catch (e) {
      setResult({ ok: false, message: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const stationOptions = useMemo(() => detail.data?.stations ?? [], [detail.data]);

  return (
    <Screen>
      <T variant="title">Report</T>
      <T variant="small">Your report counts once per train and station every 10 minutes. A status is confirmed only when 5+ commuters agree.</T>

      <T variant="label">1 · Choose a train</T>
      {active.loading && !active.data ? (
        <Loading />
      ) : active.error ? (
        <ErrorState message={active.error} onRetry={active.reload} />
      ) : (
        <Chips
          value={instanceId}
          onChange={(v) => {
            setInstanceId(v);
            setResult(null);
          }}
          color={(v) => {
            const t = active.data?.find((x) => x.instanceId === v);
            return t ? LINE_COLORS[t.line] : undefined;
          }}
          options={(active.data ?? []).map((t) => ({ value: t.instanceId, label: `${t.number} · ${t.name.replace(/ (Fast|Slow)$/, '')}` }))}
        />
      )}

      {selected && (
        <>
          <Row style={{ gap: 6 }}>
            <SimBadge />
            <T variant="small">{selected.status === 'running' ? `Heading to ${selected.nextStation?.name}` : `At ${selected.previousStation.name}`}</T>
          </Row>

          <T variant="label">2 · Where are you?</T>
          {detail.loading ? <Loading /> : <StationPicker label="Reporting station" value={station} stations={stationOptions} onChange={(s) => s && setStation(s as StationTime)} allowClear={false} />}

          <T variant="label">3 · What do you see?</T>
          <Chips value={mode} onChange={(m) => { setMode(m); setResult(null); }} options={[{ value: 'crowd', label: 'Crowd level' }, { value: 'delay', label: 'Delay' }]} />

          {mode === 'crowd' ? (
            <View style={{ gap: space.sm }}>
              {(['green', 'yellow', 'red'] as CrowdLevel[]).map((l) => {
                const active = level === l;
                return (
                  <Pressable
                    key={l}
                    onPress={() => setLevel(l)}
                    style={{ borderRadius: radius.md, borderWidth: 2, borderColor: active ? colors.crowd[l] : colors.border, backgroundColor: active ? colors.crowdSoft[l] : colors.card, padding: space.lg }}
                  >
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View>
                        <T variant="h3" color={colors.crowd[l]}>
                          {l.toUpperCase()} · {CROWD_INFO[l].label}
                        </T>
                        <T variant="small">{CROWD_INFO[l].hint}</T>
                      </View>
                      <CoachMeter level={l} size={12} />
                    </Row>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {DELAY_OPTIONS.map((c) => {
                const active = category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={{ width: '48%', borderRadius: radius.md, borderWidth: 2, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.card, padding: space.md }}
                  >
                    <T style={{ fontWeight: '600' }}>{DELAY_LABELS[c]}</T>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Button title="Submit report" icon="send" onPress={submit} loading={busy} disabled={!canSubmit} />

          {result && (
            <Card style={{ borderColor: result.ok ? colors.crowd.green : colors.danger, backgroundColor: result.ok ? colors.crowdSoft.green : colors.dangerSoft }}>
              <Row style={{ gap: 8 }}>
                <Ionicons name={result.ok ? 'checkmark-circle' : 'alert-circle'} size={20} color={result.ok ? colors.crowd.green : colors.danger} />
                <T style={{ flex: 1 }}>{result.message}</T>
              </Row>
            </Card>
          )}
          {result?.verdict && mode === 'crowd' && <CrowdStatusCard verdict={result.verdict} title={`Crowd at ${station?.name}`} />}
          {result?.verdict && mode === 'delay' && (
            <Card>
              <T variant="label">Delay at {station?.name}</T>
              <T variant="h3" style={{ marginTop: 4 }}>
                {result.verdict.state === 'confirmed' ? `Confirmed: ${DELAY_LABELS[result.verdict.value as DelayCategory]}` : result.verdict.state === 'mixed' ? 'Mixed reports' : 'Unverified'}
              </T>
              <T variant="small">{result.verdict.message}</T>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
