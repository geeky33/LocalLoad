import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Basic page wrapper: safe area + optional scrolling + pull-to-refresh. */
export function Screen({
  children,
  scroll = true,
  refreshControl,
  edges = ['top'],
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<any>;
  edges?: ('top' | 'bottom')[];
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.screen} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screen, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function T({
  children,
  variant = 'body',
  color,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  variant?: 'title' | 'h2' | 'h3' | 'body' | 'small' | 'label';
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { colors } = useTheme();
  const muted = variant === 'small' || variant === 'label';
  return (
    <Text numberOfLines={numberOfLines} style={[styles[variant], { color: color ?? (muted ? colors.muted : colors.text) }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const { colors } = useTheme();
  const body = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style];
  if (!onPress) return <View style={body}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [body, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const bg = { primary: colors.primary, secondary: colors.primarySoft, ghost: 'transparent', danger: colors.dangerSoft }[variant];
  const fg = { primary: colors.onPrimary, secondary: colors.primary, ghost: colors.primary, danger: colors.danger }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, error, icon, ...props }: TextInputProps & { label: string; error?: string; icon?: IconName }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: space.md }}>
      <T variant="label" style={{ marginBottom: 6 }}>
        {label}
      </T>
      <View style={[styles.input, { backgroundColor: colors.card, borderColor: error ? colors.danger : colors.border }]}>
        {icon && <Ionicons name={icon} size={18} color={colors.muted} />}
        <TextInput placeholderTextColor={colors.muted} style={[styles.inputText, { color: colors.text }]} {...props} />
      </View>
      {!!error && (
        <T variant="small" color={colors.danger} style={{ marginTop: 4 }}>
          {error}
        </T>
      )}
    </View>
  );
}

/** Horizontal set of selectable chips (used for filters and pickers). */
export function Chips<V extends string>({
  options,
  value,
  onChange,
  color,
}: {
  options: { value: V; label: string }[];
  value: V | null;
  onChange: (v: V) => void;
  color?: (v: V) => string | undefined;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: 2 }}>
      {options.map((o) => {
        const active = o.value === value;
        const tint = color?.(o.value) ?? colors.primary;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.chip, { borderColor: active ? tint : colors.border, backgroundColor: active ? tint : colors.card }]}
          >
            <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Pill({ text, color, bg, icon }: { text: string; color: string; bg: string; icon?: IconName }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={12} color={color} />}
      <Text style={{ color, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>{text}</Text>
    </View>
  );
}

/** The "SIMULATED" transparency badge shown wherever demo data is displayed. */
export function SimBadge({ text = 'SIMULATED' }: { text?: string }) {
  const { colors } = useTheme();
  return <Pill text={text} color={colors.primary} bg={colors.primarySoft} icon="flask-outline" />;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <T variant="h3">{title}</T>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Loading({ text = 'Loading…' }: { text?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
      <T variant="small" style={{ marginTop: space.sm }}>
        {text}
      </T>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
      <T style={{ textAlign: 'center', marginVertical: space.sm }}>{message}</T>
      {onRetry && <Button title="Try again" variant="secondary" onPress={onRetry} icon="refresh" />}
    </View>
  );
}

export function Empty({ icon = 'file-tray-outline', text }: { icon?: IconName; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={30} color={colors.muted} />
      <T variant="small" style={{ textAlign: 'center', marginTop: space.sm }}>
        {text}
      </T>
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, paddingBottom: 40, gap: space.md },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700' },
  h3: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  card: { borderRadius: radius.md, padding: space.lg, borderWidth: StyleSheet.hairlineWidth },
  button: {
    height: 50,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: space.lg,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  input: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, height: 50 },
  inputText: { flex: 1, fontSize: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xl },
});
