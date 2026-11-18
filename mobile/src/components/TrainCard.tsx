import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { LINE_COLORS, LINE_NAMES, space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { TrainSummary } from '../types';
import { CrowdPill, DelayPill } from './Crowd';
import { Button, Card, Pill, Row, T } from './ui';

export function TrainCard({ train, onTrack, compact }: { train: TrainSummary; onTrack: () => void; compact?: boolean }) {
  const { colors } = useTheme();
  const lineColor = LINE_COLORS[train.line];
  const from = train.boardAt ?? { name: train.source, time: train.departureTime };
  const to = train.alightAt ?? { name: train.destination, time: train.arrivalTime };

  return (
    <Card onPress={onTrack} style={{ gap: space.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: 6 }}>
          <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: lineColor }} />
          <T variant="h3">{train.number}</T>
          <Pill text={train.type.toUpperCase()} color={train.type === 'fast' ? colors.danger : colors.primary} bg={train.type === 'fast' ? colors.dangerSoft : colors.primarySoft} />
        </Row>
        <T variant="small">
          {LINE_NAMES[train.line]} · {train.direction === 'up' ? 'Up ↑' : 'Down ↓'}
        </T>
      </Row>

      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T variant="h2">{from.time}</T>
          <T variant="small" numberOfLines={1}>
            {from.name}
          </T>
        </View>
        <Ionicons name="arrow-forward" size={18} color={colors.muted} />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <T variant="h2">{to.time}</T>
          <T variant="small" numberOfLines={1}>
            {to.name}
          </T>
        </View>
      </Row>

      <Row style={{ gap: 6, flexWrap: 'wrap' }}>
        <CrowdPill verdict={train.crowd} />
        <DelayPill verdict={train.delay} />
      </Row>

      {!compact && <Button title="Track Train" icon="navigate" variant="secondary" onPress={onTrack} />}
    </Card>
  );
}
