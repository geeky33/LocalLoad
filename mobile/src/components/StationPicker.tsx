import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LINE_COLORS, LINE_NAMES, radius, space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Line } from '../types';
import { Row, T } from './ui';

export interface PickerStation {
  _id: string;
  name: string;
  line?: Line;
}

/** Tappable field that opens a searchable station list. */
export function StationPicker({
  label,
  value,
  stations,
  onChange,
  placeholder = 'Any station',
  allowClear = true,
}: {
  label: string;
  value: PickerStation | null;
  stations: PickerStation[];
  onChange: (s: PickerStation | null) => void;
  placeholder?: string;
  allowClear?: boolean;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const list = useMemo(() => stations.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())), [stations, q]);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.md, padding: space.md }}
      >
        <T variant="label">{label}</T>
        <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
          <T style={{ fontWeight: '600' }} color={value ? colors.text : colors.muted} numberOfLines={1}>
            {value?.name ?? placeholder}
          </T>
          {value && allowClear ? (
            <Pressable hitSlop={10} onPress={() => onChange(null)}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : (
            <Ionicons name="chevron-down" size={16} color={colors.muted} />
          )}
        </Row>
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <Row style={{ padding: space.lg, gap: space.md }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: space.md, height: 44, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Search station" placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.text, fontSize: 16 }} />
            </View>
            <Pressable onPress={() => setOpen(false)}>
              <T color={colors.primary} style={{ fontWeight: '600' }}>
                Close
              </T>
            </Pressable>
          </Row>
          <FlatList
            data={list}
            keyExtractor={(s) => s._id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                  setQ('');
                }}
                style={({ pressed }) => ({ paddingHorizontal: space.lg, paddingVertical: 14, backgroundColor: pressed ? colors.cardAlt : 'transparent', borderBottomWidth: 0.5, borderColor: colors.border })}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <T>{item.name}</T>
                  {item.line && (
                    <Row style={{ gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: LINE_COLORS[item.line] }} />
                      <T variant="small">{LINE_NAMES[item.line]}</T>
                    </Row>
                  )}
                </Row>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}
