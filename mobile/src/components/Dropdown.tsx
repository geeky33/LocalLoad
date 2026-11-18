import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { radius, space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Row, T } from './ui';

/** A simple dropdown: a field that opens a list of options in a bottom sheet. */
export function Dropdown<V extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: { value: V; label: string; hint?: string }[];
  onChange: (v: V) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.md, padding: space.md }}
      >
        <T variant="label">{label}</T>
        <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
          <T style={{ fontWeight: '600' }}>{current?.label ?? 'Select'}</T>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </Row>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable style={{ backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30, maxHeight: '70%' }}>
            <View style={{ padding: space.lg, borderBottomWidth: 0.5, borderColor: colors.border }}>
              <T variant="h3">{label}</T>
            </View>
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.value)}
              renderItem={({ item }) => {
                const selected = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => ({ paddingHorizontal: space.lg, paddingVertical: 14, backgroundColor: pressed ? colors.cardAlt : 'transparent' })}
                  >
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View>
                        <T style={{ fontWeight: selected ? '700' : '400' }} color={selected ? colors.primary : colors.text}>
                          {item.label}
                        </T>
                        {item.hint && <T variant="small">{item.hint}</T>}
                      </View>
                      {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                    </Row>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
