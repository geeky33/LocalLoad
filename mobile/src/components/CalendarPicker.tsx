import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { radius, space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { CrowdLevel } from '../types';
import { Button, Row, T } from './ui';

const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const pad = (n: number) => String(n).padStart(2, '0');
export const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Today's date in India (the server groups insights by IST dates). */
export function istToday() {
  const t = new Date(Date.now() + 5.5 * 3600_000);
  return toKey(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

export function formatKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Month-view calendar in a modal (no extra dependency, works in Expo Go).
 * Days that have stored reports show a dot coloured by their average crowd level.
 */
export function CalendarPicker({
  visible,
  value,
  marked,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  marked: Record<string, CrowdLevel>;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [y0, m0] = value.split('-').map(Number);
  const [month, setMonth] = useState({ y: y0, m: m0 - 1 });
  const today = istToday();

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(month.y, month.m, 1));
    const lead = (first.getUTCDay() + 6) % 7; // Monday-first
    const days = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [month]);

  const shift = (delta: number) => setMonth(({ y, m }) => ({ y: m + delta < 0 ? y - 1 : m + delta > 11 ? y + 1 : y, m: (m + delta + 12) % 12 }));
  const title = new Date(Date.UTC(month.y, month.m, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: space.lg }} onPress={onClose}>
        <Pressable style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Pressable onPress={() => shift(-1)} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </Pressable>
            <T variant="h3">{title}</T>
            <Pressable onPress={() => shift(1)} hitSlop={12}>
              <Ionicons name="chevron-forward" size={22} color={colors.primary} />
            </Pressable>
          </Row>

          <View style={{ flexDirection: 'row' }}>
            {WEEK.map((w) => (
              <T key={w} variant="small" style={{ flex: 1, textAlign: 'center', fontWeight: '700' }}>
                {w}
              </T>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((d, i) => {
              if (d === null) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
              const key = toKey(month.y, month.m, d);
              const selected = key === value;
              const dot = marked[key];
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    onSelect(key);
                    onClose();
                  }}
                  style={{ width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? colors.primary : 'transparent',
                      borderWidth: key === today && !selected ? 1 : 0,
                      borderColor: colors.primary,
                    }}
                  >
                    <T color={selected ? colors.onPrimary : dot ? colors.text : colors.muted} style={{ fontWeight: selected || dot ? '700' : '400' }}>
                      {d}
                    </T>
                  </View>
                  <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 1, backgroundColor: dot ? colors.crowd[dot] : 'transparent' }} />
                </Pressable>
              );
            })}
          </View>

          <Row style={{ gap: space.md, flexWrap: 'wrap' }}>
            {(['green', 'yellow', 'red'] as CrowdLevel[]).map((l) => (
              <Row key={l} style={{ gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.crowd[l] }} />
                <T variant="small">{l === 'green' ? 'quiet day' : l === 'yellow' ? 'moderate' : 'busy'}</T>
              </Row>
            ))}
            <T variant="small">· no dot = no reports</T>
          </Row>

          <Row style={{ gap: space.sm }}>
            <Button
              title="Today"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => {
                onSelect(today);
                onClose();
              }}
            />
            <Button title="Close" variant="ghost" style={{ flex: 1 }} onPress={onClose} />
          </Row>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
