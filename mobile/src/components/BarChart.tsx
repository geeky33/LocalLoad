import React from 'react';
import { View } from 'react-native';
import { space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { CrowdLevel } from '../types';
import { T } from './ui';

/** Dependency-free vertical bar chart. Bars are coloured by crowd level. */
export function BarChart({
  data,
  max,
  height = 120,
  highlight,
}: {
  data: { label: string; value: number; level: CrowdLevel }[];
  max: number;
  height?: number;
  highlight?: number; // index of a bar to emphasise; the others are dimmed
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: height + 22, gap: 3, marginTop: space.sm }}>
      {data.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center' }}>
          <View
            style={{
              width: '100%',
              height: Math.max(3, (d.value / (max || 1)) * height),
              backgroundColor: colors.crowd[d.level],
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              opacity: highlight === undefined || highlight === i ? 0.95 : 0.3,
            }}
          />
          <T variant="small" style={{ fontSize: 10, marginTop: 4, fontWeight: highlight === i ? '800' : '400' }} numberOfLines={1}>
            {d.label}
          </T>
        </View>
      ))}
    </View>
  );
}
