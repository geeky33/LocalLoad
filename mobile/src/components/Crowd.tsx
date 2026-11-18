import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { radius, space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { CrowdLevel, DelayCategory, Reporter, Verdict } from '../types';
import { CROWD_INFO, DELAY_LABELS, timeAgo } from '../utils/format';
import { Card, Pill, Row, T } from './ui';

const LEVELS: CrowdLevel[] = ['green', 'yellow', 'red'];

/**
 * LocalLoad's signature "coach meter": three coaches that fill up with the crowd level.
 * Grey coaches = no confirmed level (we never show an unconfirmed colour as confirmed).
 */
export function CoachMeter({ level, size = 10 }: { level: CrowdLevel | null; size?: number }) {
  const { colors } = useTheme();
  const filled = level ? LEVELS.indexOf(level) + 1 : 0;
  return (
    <Row style={{ gap: 3 }}>
      {LEVELS.map((_, i) => (
        <View
          key={i}
          style={{
            width: size * 1.6,
            height: size,
            borderRadius: 3,
            backgroundColor: level && i < filled ? colors.crowd[level] : colors.neutralSoft,
            borderWidth: 1,
            borderColor: level && i < filled ? colors.crowd[level] : colors.border,
          }}
        />
      ))}
    </Row>
  );
}

/**
 * Who reported: one chip per counted vote, coloured by the level that person chose.
 * Simulated demo commuters are marked "demo" so they are never mistaken for real people.
 */
export function ReporterList({ reporters, max = 6 }: { reporters?: Reporter[]; max?: number }) {
  const { colors } = useTheme();
  if (!reporters?.length) return null;
  const shown = reporters.slice(0, max);
  return (
    <View style={{ gap: 4 }}>
      <T variant="small">Reported by</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {shown.map((r, i) => {
          const lvl = (['green', 'yellow', 'red'].includes(r.value) ? r.value : null) as CrowdLevel | null;
          return (
            <View
              key={`${r.name}-${i}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: lvl ? colors.crowdSoft[lvl] : colors.neutralSoft }}
            >
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: lvl ? colors.crowd[lvl] : colors.muted }} />
              <T variant="small" color={colors.text} style={{ fontSize: 12 }}>
                {r.name}
              </T>
              {r.demo && (
                <T variant="small" style={{ fontSize: 10, fontStyle: 'italic' }}>
                  demo
                </T>
              )}
            </View>
          );
        })}
        {reporters.length > max && <T variant="small">+{reporters.length - max} more</T>}
      </View>
    </View>
  );
}

/** Compact crowd status for train cards. */
export function CrowdPill({ verdict }: { verdict: Verdict | null }) {
  const { colors } = useTheme();
  if (verdict?.state === 'confirmed' && verdict.value) {
    const lvl = verdict.value as CrowdLevel;
    return <Pill text={CROWD_INFO[lvl].label.toUpperCase()} color={colors.crowd[lvl]} bg={colors.crowdSoft[lvl]} icon="people" />;
  }
  if (verdict?.state === 'mixed') return <Pill text="MIXED REPORTS" color={colors.muted} bg={colors.neutralSoft} icon="git-compare-outline" />;
  return <Pill text="NOT ENOUGH REPORTS" color={colors.muted} bg={colors.neutralSoft} icon="people-outline" />;
}

export function DelayPill({ verdict }: { verdict: Verdict | null }) {
  const { colors } = useTheme();
  if (verdict?.state === 'confirmed' && verdict.value) {
    const onTime = verdict.value === 'on-time';
    return (
      <Pill
        text={DELAY_LABELS[verdict.value as DelayCategory].toUpperCase()}
        color={onTime ? colors.crowd.green : colors.danger}
        bg={onTime ? colors.crowdSoft.green : colors.dangerSoft}
        icon="time"
      />
    );
  }
  if (verdict?.state === 'mixed') return <Pill text="DELAY: MIXED" color={colors.muted} bg={colors.neutralSoft} icon="time-outline" />;
  return <Pill text="NO DELAY DATA" color={colors.muted} bg={colors.neutralSoft} icon="time-outline" />;
}

/** Full verification card: level, status, count, distribution bar, last update. */
export function CrowdStatusCard({ verdict, title = 'Crowd status' }: { verdict: Verdict | null; title?: string }) {
  const { colors } = useTheme();
  const total = verdict?.total ?? 0;
  const threshold = verdict?.threshold ?? 5;
  const confirmed = verdict?.state === 'confirmed' && verdict.value ? (verdict.value as CrowdLevel) : null;
  const accent = confirmed ? colors.crowd[confirmed] : colors.muted;

  const statusText =
    verdict?.state === 'confirmed' ? 'Verified by commuters' : verdict?.state === 'mixed' ? 'Mixed reports' : 'Unverified';

  return (
    <Card style={{ borderLeftWidth: 4, borderLeftColor: accent }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="label">{title}</T>
        <Row style={{ gap: 4 }}>
          <Ionicons name={confirmed ? 'shield-checkmark' : 'shield-outline'} size={14} color={accent} />
          <T variant="small" color={accent} style={{ fontWeight: '700' }}>
            {statusText}
          </T>
        </Row>
      </Row>

      <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
        <View style={{ flex: 1 }}>
          <T variant="h2" color={confirmed ? accent : colors.text}>
            {confirmed ? CROWD_INFO[confirmed].label : verdict?.state === 'mixed' ? 'No clear consensus' : 'Not enough reports'}
          </T>
          <T variant="small">{confirmed ? CROWD_INFO[confirmed].hint : (verdict?.message ?? `No reports yet — 0/${threshold} reports received.`)}</T>
        </View>
        <CoachMeter level={confirmed} size={14} />
      </Row>

      {/* Distribution bar - labelled provisional until confirmed */}
      <View style={[styles.bar, { backgroundColor: colors.neutralSoft }]}>
        {total > 0 &&
          LEVELS.map((l) =>
            verdict!.distribution[l] ? (
              <View key={l} style={{ flex: verdict!.distribution[l], backgroundColor: colors.crowd[l], opacity: confirmed ? 1 : 0.55 }} />
            ) : null,
          )}
      </View>
      <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
        <Row style={{ gap: space.md }}>
          {LEVELS.map((l) => (
            <Row key={l} style={{ gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.crowd[l] }} />
              <T variant="small">{verdict?.distribution[l] ?? 0}</T>
            </Row>
          ))}
        </Row>
        <T variant="small">
          {Math.min(total, 99)}/{threshold}+ reports{verdict?.station ? ` · ${verdict.station.name}` : ''}
        </T>
      </Row>
      <T variant="small" style={{ marginTop: 4 }}>
        {verdict?.state !== 'confirmed' && total > 0 ? 'Provisional · ' : ''}Updated {timeAgo(verdict?.lastUpdated)}
      </T>
      {!!verdict?.reporters?.length && (
        <View style={{ marginTop: space.sm }}>
          <ReporterList reporters={verdict.reporters} max={8} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  bar: { height: 8, borderRadius: radius.pill, overflow: 'hidden', flexDirection: 'row', marginTop: space.md },
});
