import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { BarChart } from '../components/BarChart';
import { CalendarPicker, formatKey, istToday } from '../components/CalendarPicker';
import { CoachMeter } from '../components/Crowd';
import { Dropdown } from '../components/Dropdown';
import { Card, Chips, Empty, ErrorState, Loading, Row, Screen, SectionHeader, SimBadge, T } from '../components/ui';
import { LINE_COLORS, radius, space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAsync } from '../hooks/useAsync';
import { api } from '../services/api';
import { CrowdLevel, Line } from '../types';
import { hourLabel, scoreLevel } from '../utils/format';

interface HourRow { hour: number; count: number; avgScore: number; green: number; yellow: number; red: number }
interface Overview {
  filter: { type: 'all' | 'weekday' | 'date'; label: string; day?: number; date?: string };
  totalReports: number;
  sampleReports: number;
  hourly: HourRow[];
  busiestSlots: HourRow[];
  bestTimes: HourRow[];
  morningVsEvening: { morning: Omit<HourRow, 'hour'>; evening: Omit<HourRow, 'hour'> };
  stations: { _id: string; name: string; line: Line; count: number; avgScore: number }[];
  trains: { _id: string; name: string; number: string; line: Line; avgScore: number; count: number }[];
}

type Mode = 'weekday' | 'date';
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** ISO weekday (1 = Monday) of today in India. */
function istWeekday() {
  const d = new Date(Date.now() + 5.5 * 3600_000).getUTCDay();
  return ((d + 6) % 7) + 1;
}

export default function InsightsScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('weekday');
  const [day, setDay] = useState<number>(istWeekday()); // defaults to today's weekday
  const [date, setDate] = useState<string>(istToday());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [stationId, setStationId] = useState<string | null>(null);

  const params = mode === 'weekday' ? { day } : { date };

  const { data, loading, error, reload } = useAsync(async () => {
    const [o, w] = await Promise.all([
      api.get<Overview>('/insights/overview', { params }),
      api.get<{ days: { day: string; isoDay: number; avgScore: number; count: number }[] }>('/insights/weekly'),
    ]);
    return { overview: o.data, weekly: w.data.days };
  }, [mode, day, date]);

  // Dates that have data, for the calendar dots
  const dates = useAsync(
    () =>
      api.get<{ dates: { date: string; avgScore: number }[] }>('/insights/dates').then((r) =>
        Object.fromEntries(r.data.dates.map((d) => [d.date, scoreLevel(d.avgScore)])) as Record<string, CrowdLevel>,
      ),
    [],
  );

  const station = useAsync(
    () =>
      stationId
        ? api.get<{ hourly: HourRow[]; station: { name: string } }>(`/insights/station/${stationId}`, { params }).then((r) => r.data)
        : Promise.resolve(null),
    [stationId, mode, day, date],
  );

  const scoreBars = (rows: HourRow[]) => rows.map((h) => ({ label: h.hour % 3 === 0 ? hourLabel(h.hour) : '', value: h.avgScore - 0.8, level: scoreLevel(h.avgScore) }));
  const selectedWeekday = mode === 'weekday' ? day : (() => {
    const [y, m, d] = date.split('-').map(Number);
    return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
  })();
  const isToday = mode === 'weekday' ? day === istWeekday() : date === istToday();

  const filterBar = (
    <Card style={{ gap: space.md }}>
      <Chips<Mode>
        value={mode}
        onChange={(m) => {
          setMode(m);
          setStationId(null);
        }}
        options={[
          { value: 'weekday', label: 'By weekday' },
          { value: 'date', label: 'By date' },
        ]}
      />
      {mode === 'weekday' ? (
        <Dropdown<number>
          label="Weekday"
          value={day}
          onChange={(d) => {
            setDay(d);
            setStationId(null);
          }}
          options={WEEKDAYS.map((name, i) => ({ value: i + 1, label: name, hint: i + 1 === istWeekday() ? 'Today' : undefined }))}
        />
      ) : (
        <Pressable
          onPress={() => setCalendarOpen(true)}
          style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.md, padding: space.md }}
        >
          <T variant="label">Date</T>
          <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
            <T style={{ fontWeight: '600' }}>{formatKey(date)}</T>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          </Row>
        </Pressable>
      )}
      <T variant="small">
        {mode === 'weekday'
          ? `Showing every ${WEEKDAYS[day - 1]} in the stored data${isToday ? ' (today’s weekday)' : ''}.`
          : `Showing reports from ${formatKey(date)} only${isToday ? ' (today)' : ''}.`}
      </T>
    </Card>
  );

  const header = (
    <>
      <T variant="title">Insights</T>
      <Row style={{ gap: 6 }}>
        <SimBadge text="SAMPLE HISTORICAL DATA" />
      </Row>
      {filterBar}
      <CalendarPicker
        visible={calendarOpen}
        value={date}
        marked={dates.data ?? {}}
        onSelect={(d) => {
          setDate(d);
          setStationId(null);
        }}
        onClose={() => setCalendarOpen(false)}
      />
    </>
  );

  if (loading && !data) return <Screen>{header}<Loading text="Crunching sample data…" /></Screen>;
  if (error || !data) return <Screen>{header}<ErrorState message={error ?? 'No data'} onRetry={reload} /></Screen>;

  const o = data.overview;
  const hours = o.hourly.filter((h) => h.hour >= 6 && h.hour <= 22);
  const { morning, evening } = o.morningVsEvening;

  return (
    <Screen refreshControl={<RefreshControl refreshing={false} onRefresh={() => { reload(); dates.reload(true); }} />}>
      {header}

      {o.totalReports === 0 ? (
        <Card>
          <Empty
            icon="calendar-clear-outline"
            text={
              mode === 'date'
                ? `No crowd reports were stored on ${formatKey(date)}. Days with data have a coloured dot in the calendar.`
                : `No crowd reports for ${WEEKDAYS[day - 1]} yet.`
            }
          />
        </Card>
      ) : (
        <>
          <T variant="small">
            {o.filter.label}: {o.totalReports.toLocaleString()} stored crowd reports ({o.sampleReports.toLocaleString()} seeded demo records). Score: 1 = low, 3 = high crowd.
          </T>

          <Card style={{ gap: space.sm }}>
            <T variant="label">Best time to travel</T>
            {o.bestTimes.length === 0 ? (
              <T variant="small">Not enough reports per hour on this day to rank times.</T>
            ) : (
              <Row style={{ gap: space.sm }}>
                {o.bestTimes.map((h) => (
                  <View key={h.hour} style={{ flex: 1, backgroundColor: colors.crowdSoft.green, borderRadius: 12, padding: space.md, alignItems: 'center' }}>
                    <T variant="h2" color={colors.crowd.green}>{hourLabel(h.hour)}</T>
                    <T variant="small">score {h.avgScore}</T>
                  </View>
                ))}
              </Row>
            )}
            <T variant="label" style={{ marginTop: space.sm }}>Most crowded slots</T>
            {o.busiestSlots.length === 0 ? (
              <T variant="small">Not enough reports per hour on this day to rank times.</T>
            ) : (
              <Row style={{ gap: space.sm }}>
                {o.busiestSlots.map((h) => (
                  <View key={h.hour} style={{ flex: 1, backgroundColor: colors.crowdSoft.red, borderRadius: 12, padding: space.md, alignItems: 'center' }}>
                    <T variant="h2" color={colors.crowd.red}>{hourLabel(h.hour)}</T>
                    <T variant="small">score {h.avgScore}</T>
                  </View>
                ))}
              </Row>
            )}
          </Card>

          <Card>
            <T variant="label">Crowd by hour (6am – 10pm)</T>
            {hours.length ? <BarChart data={scoreBars(hours)} max={2.2} /> : <T variant="small">No reports between 6am and 10pm.</T>}
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
                      <T variant="small">{v.count ? `avg ${v.avgScore}` : 'no reports'}</T>
                      <CoachMeter level={v.count ? scoreLevel(v.avgScore) : null} />
                    </Row>
                  </Row>
                  <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.neutralSoft }}>
                    <View style={{ flex: v.green / total, backgroundColor: colors.crowd.green }} />
                    <View style={{ flex: v.yellow / total, backgroundColor: colors.crowd.yellow }} />
                    <View style={{ flex: v.red / total, backgroundColor: colors.crowd.red }} />
                  </View>
                  {v.count > 0 && (
                    <T variant="small">
                      {Math.round((v.red / total) * 100)}% red · {Math.round((v.yellow / total) * 100)}% yellow · {Math.round((v.green / total) * 100)}% green
                    </T>
                  )}
                </View>
              );
            })}
          </Card>

          <SectionHeader title="Most crowded stations" />
          <T variant="small">Tap a station for its hourly pattern on the selected day.</T>
          {o.stations.length === 0 && <T variant="small">Not enough reports per station on this day.</T>}
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
        </>
      )}

      <Card>
        <T variant="label">Weekly trend (all stored data, avg crowd score by day)</T>
        <BarChart
          data={data.weekly.map((d) => ({ label: d.day, value: Math.max(0, d.avgScore - 0.8), level: scoreLevel(d.avgScore) }))}
          max={1.6}
          height={100}
          highlight={selectedWeekday - 1}
        />
      </Card>
    </Screen>
  );
}
