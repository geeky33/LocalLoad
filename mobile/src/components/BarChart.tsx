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
}: {
  data: { label: string; value: number; level: CrowdLevel }[];
  max: number;
  height?: number;
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
              opacity: 0.9,
            }}
          />
          <T variant="small" style={{ fontSize: 10, marginTop: 4 }} numberOfLines={1}>
            {d.label}
          </T>
        </View>
      ))}
    </View>
  );
}
