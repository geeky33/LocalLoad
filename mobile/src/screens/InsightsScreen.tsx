import { useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { BarChart } from '../components/BarChart';
import { CoachMeter } from '../components/Crowd';
import { Card, ErrorState, Loading, Row, Screen, SectionHeader, SimBadge, T } from '../components/ui';
import { LINE_COLORS, space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAsync } from '../hooks/useAsync';
import { api } from '../services/api';
import { Line } from '../types';
import { hourLabel, scoreLevel } from '../utils/format';

interface HourRow { hour: number; count: number; avgScore: number; green: number; yellow: number; red: number }
interface Overview {
  totalReports: number;
  sampleReports: number;
  hourly: HourRow[];
  busiestSlots: HourRow[];
  bestTimes: HourRow[];
  morningVsEvening: { morning: Omit<HourRow, 'hour'>; evening: Omit<HourRow, 'hour'> };
  stations: { _id: string; name: string; line: Line; count: number; avgScore: number }[];
  trains: { _id: string; name: string; number: string; line: Line; avgScore: number; count: number }[];
}

export default function InsightsScreen() {
  const { colors } = useTheme();
  const [stationId, setStationId] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsync(async () => {
    const [o, w] = await Promise.all([
      api.get<Overview>('/insights/overview'),
      api.get<{ days: { day: string; avgScore: number; count: number }[] }>('/insights/weekly'),
    ]);
    return { overview: o.data, weekly: w.data.days };
  });
  const station = useAsync(
    () => (stationId ? api.get<{ hourly: HourRow[]; station: { name: string } }>(`/insights/station/${stationId}`).then((r) => r.data) : Promise.resolve(null)),
    [stationId],
  );

  if (loading && !data) return <Screen><Loading text="Crunching sample data…" /></Screen>;
  if (error || !data) return <Screen><ErrorState message={error ?? 'No data'} onRetry={reload} /></Screen>;

  const o = data.overview;
  const hours = o.hourly.filter((h) => h.hour >= 6 && h.hour <= 22);
  const scoreBars = (rows: HourRow[]) => rows.map((h) => ({ label: h.hour % 3 === 0 ? hourLabel(h.hour) : '', value: h.avgScore - 0.8, level: scoreLevel(h.avgScore) }));
  const { morning, evening } = o.morningVsEvening;

  return (
    <Screen refreshControl={<RefreshControl refreshing={false} onRefresh={() => reload()} />}>
      <T variant="title">Insights</T>
      <Row style={{ gap: 6 }}>
        <SimBadge text="SAMPLE HISTORICAL DATA" />
      </Row>
      <T variant="small">
        Aggregated from {o.totalReports.toLocaleString()} stored crowd reports ({o.sampleReports.toLocaleString()} are seeded demo records). Score: 1 = low, 3 = high crowd.
      </T>

      <Card style={{ gap: space.sm }}>
        <T variant="label">Best time to travel</T>
        <Row style={{ gap: space.sm }}>
          {o.bestTimes.map((h) => (
            <View key={h.hour} style={{ flex: 1, backgroundColor: colors.crowdSoft.green, borderRadius: 12, padding: space.md, alignItems: 'center' }}>
              <T variant="h2" color={colors.crowd.green}>{hourLabel(h.hour)}</T>
              <T variant="small">score {h.avgScore}</T>
            </View>
          ))}
        </Row>
        <T variant="label" style={{ marginTop: space.sm }}>Most crowded slots</T>
        <Row style={{ gap: space.sm }}>
          {o.busiestSlots.map((h) => (
            <View key={h.hour} style={{ flex: 1, backgroundColor: colors.crowdSoft.red, borderRadius: 12, padding: space.md, alignItems: 'center' }}>
              <T variant="h2" color={colors.crowd.red}>{hourLabel(h.hour)}</T>
              <T variant="small">score {h.avgScore}</T>
            </View>
          ))}
        </Row>
      </Card>

      <Card>
        <T variant="label">Crowd by hour (6am – 10pm)</T>
        <BarChart data={scoreBars(hours)} max={2.2} />
      </Card>

      <Card style={{ gap: space.md }}>
        <T variant="label">Morning (7–11am) vs Evening (5–9pm)</T>
        {[
          ['Morning', morning],
          ['Evening', evening],
        ].map(([label, s]) => {
          const v = s as typeof morning;
          const total = v.count || 1;
          return (
            <View key={label as string} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T style={{ fontWeight: '700' }}>{label as string}</T>
                <Row style={{ gap: 8 }}>
                  <T variant="small">avg {v.avgScore}</T>
                  <CoachMeter level={scoreLevel(v.avgScore)} />
                </Row>
              </Row>
              <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' }}>
                <View style={{ flex: v.green / total, backgroundColor: colors.crowd.green }} />
                <View style={{ flex: v.yellow / total, backgroundColor: colors.crowd.yellow }} />
                <View style={{ flex: v.red / total, backgroundColor: colors.crowd.red }} />
              </View>
              <T variant="small">
                {Math.round((v.red / total) * 100)}% red · {Math.round((v.yellow / total) * 100)}% yellow · {Math.round((v.green / total) * 100)}% green
              </T>
            </View>
          );
        })}
      </Card>

      <Card>
        <T variant="label">Weekly trend (avg crowd score by day)</T>
        <BarChart data={data.weekly.map((d) => ({ label: d.day, value: Math.max(0, d.avgScore - 0.8), level: scoreLevel(d.avgScore) }))} max={1.6} height={100} />
      </Card>

      <SectionHeader title="Most crowded stations" />
      <T variant="small">Tap a station for its hourly pattern.</T>
      {o.stations.map((s, i) => (
        <Pressable key={s._id} onPress={() => setStationId(stationId === s._id ? null : s._id)}>
          <Card style={{ gap: space.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row style={{ gap: 8 }}>
                <T variant="h3">{i + 1}.</T>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: LINE_COLORS[s.line] }} />
                <T style={{ fontWeight: '600' }}>{s.name}</T>
              </Row>
              <Row style={{ gap: 8 }}>
                <T variant="small">{s.avgScore}</T>
                <CoachMeter level={scoreLevel(s.avgScore)} />
              </Row>
            </Row>
            {stationId === s._id &&
              (station.loading ? <Loading /> : station.data ? <BarChart data={scoreBars(station.data.hourly.filter((h) => h.hour >= 6 && h.hour <= 22))} max={2.2} height={80} /> : null)}
          </Card>
        </Pressable>
      ))}

      <SectionHeader title="Most crowded demo trains" />
      {o.trains.map((t) => (
        <Card key={t._id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '700' }}>{t.number}</T>
              <T variant="small" numberOfLines={1}>{t.name}</T>
            </View>
            <Row style={{ gap: 8 }}>
              <T variant="small">{t.avgScore}</T>
              <CoachMeter level={scoreLevel(t.avgScore)} />
            </Row>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
