import React, { useState } from 'react';
import { Alert, RefreshControl, View } from 'react-native';
import { Button, Card, Chips, ErrorState, Loading, Row, Screen, SimBadge, T } from '../components/ui';
import { space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAsync } from '../hooks/useAsync';
import { api, errorMessage } from '../services/api';
import { PositionUpdate, Verdict } from '../types';
import { timeAgo } from '../utils/format';

type Tab = 'simulation' | 'verification' | 'reports' | 'users';

/** Minimal development dashboard. The server only allows admin accounts here. */
export default function AdminScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('simulation');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    switch (tab) {
      case 'simulation':
        return (await api.get('/admin/simulation/status')).data;
      case 'verification':
        return (await api.get('/admin/verification')).data;
      case 'reports':
        return (await api.get('/admin/reports')).data;
      case 'users':
        return (await api.get('/admin/users')).data;
    }
  }, [tab]);

  const act = async (path: string, body?: object) => {
    setBusy(true);
    try {
      await api.post(`/admin/simulation/${path}`, body);
      await reload(true);
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const verdictLine = (v: Verdict) => `${v.station.name}: ${v.state}${v.value ? ` ${v.value}` : ''} · ${v.total}/${v.threshold}`;

  return (
    <Screen edges={['bottom']} refreshControl={<RefreshControl refreshing={false} onRefresh={() => reload()} />}>
      <Chips<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'simulation', label: 'Simulation' },
          { value: 'verification', label: 'Verification' },
          { value: 'reports', label: 'Reports' },
          { value: 'users', label: 'Users' },
        ]}
      />
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : tab === 'simulation' ? (
        <>
          <Card style={{ gap: space.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="h3">{data.running ? '● Running' : '■ Stopped'}</T>
              <SimBadge />
            </Row>
            <T variant="small">
              Tick every {data.intervalMs} ms · speed ×{data.multiplier} · {data.ticks} ticks · {data.trains.length} trains
            </T>
            <Row style={{ gap: space.sm }}>
              <Button title="Start" icon="play" onPress={() => act('start')} disabled={busy || data.running} style={{ flex: 1 }} />
              <Button title="Stop" icon="pause" variant="secondary" onPress={() => act('stop')} disabled={busy || !data.running} style={{ flex: 1 }} />
            </Row>
            <Button title="Reset all trains to origin" icon="refresh" variant="ghost" onPress={() => act('reset')} loading={busy} />
            <T variant="label">Speed multiplier</T>
            <Chips value={String(data.multiplier)} onChange={(m) => act('speed', { multiplier: Number(m) })} options={['1', '5', '10', '20', '40'].map((m) => ({ value: m, label: `×${m}` }))} />
          </Card>
          {(data.trains as PositionUpdate[]).map((t) => (
            <Card key={t.instanceId} style={{ padding: space.md }}>
              <T style={{ fontWeight: '700' }}>
                {t.number} · {t.status}
              </T>
              <T variant="small">
                {t.previousStation.name} → {t.nextStation?.name ?? 'end'} · {t.speedKmph} km/h · {Math.round(t.journeyProgress * 100)}%
              </T>
            </Card>
          ))}
        </>
      ) : tab === 'verification' ? (
        data.length === 0 ? (
          <T variant="small">No reports in the current 10-minute window.</T>
        ) : (
          data.map((row: any) => (
            <Card key={row.instanceId} style={{ gap: 4 }}>
              <T style={{ fontWeight: '700' }}>
                {row.train.number} · {row.train.name}
              </T>
              {row.crowd.map((v: Verdict) => (
                <T key={`c${v.station._id}`} variant="small">Crowd · {verdictLine(v)}</T>
              ))}
              {row.delay.map((v: Verdict) => (
                <T key={`d${v.station._id}`} variant="small">Delay · {verdictLine(v)}</T>
              ))}
            </Card>
          ))
        )
      ) : tab === 'reports' ? (
        <>
          <T variant="label">Crowd reports (latest 50, excluding sample data)</T>
          {data.crowd.length === 0 && <T variant="small">None yet.</T>}
          {data.crowd.map((r: any) => (
            <View key={r._id} style={{ paddingVertical: 6, borderBottomWidth: 0.5, borderColor: colors.border }}>
              <T variant="small">
                <T variant="small" color={colors.crowd[r.level as 'green']} style={{ fontWeight: '700' }}>{r.level.toUpperCase()}</T> · {r.train?.number} @ {r.station?.name} · {r.user?.name} · {timeAgo(r.reportedAt)}
              </T>
            </View>
          ))}
          <T variant="label" style={{ marginTop: space.md }}>Delay reports</T>
          {data.delay.length === 0 && <T variant="small">None yet.</T>}
          {data.delay.map((r: any) => (
            <T key={r._id} variant="small">
              {r.category} · {r.train?.number} @ {r.station?.name} · {r.user?.name} · {timeAgo(r.reportedAt)}
            </T>
          ))}
        </>
      ) : (
        data.map((u: any) => (
          <Card key={u._id} style={{ padding: space.md }}>
            <T style={{ fontWeight: '700' }}>
              {u.name} {u.role === 'admin' ? '· admin' : ''}
            </T>
            <T variant="small">
              {u.email} · {u.points} pts
            </T>
          </Card>
        ))
      )}
    </Screen>
  );
}
