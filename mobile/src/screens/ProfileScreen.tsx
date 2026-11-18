import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { Button, Card, Chips, Row, Screen, SectionHeader, T } from '../components/ui';
import { LINE_COLORS, LINE_NAMES, space } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { ThemeMode, useTheme } from '../context/ThemeContext';
import { useAsync } from '../hooks/useAsync';
import { AppStackParamList } from '../navigation/types';
import { api, BASE_URL, errorMessage } from '../services/api';
import { ensureNotificationPermission, showLocalNotification } from '../services/notifications';
import { SavedRoute, User } from '../types';

export default function ProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { user, stats, logout, refresh } = useAuth();
  const { colors, mode, setMode } = useTheme();
  const [settings, setSettings] = useState<User['notificationSettings']>({ nearby: true, ...user!.notificationSettings });
  const routes = useAsync(() => api.get<SavedRoute[]>('/routes').then((r) => r.data));

  useFocusEffect(
    useCallback(() => {
      routes.reload(true);
      refresh().catch(() => {});
    }, [routes.reload, refresh]),
  );

  const toggle = async (key: keyof User['notificationSettings'], value: boolean) => {
    const prev = settings;
    setSettings({ ...settings, [key]: value });
    if (key === 'enabled' && value) ensureNotificationPermission();
    try {
      await api.put('/notifications/settings', { [key]: value });
      refresh().catch(() => {});
    } catch (e) {
      setSettings(prev);
      Alert.alert('Could not save', errorMessage(e));
    }
  };

  const remove = (r: SavedRoute) =>
    Alert.alert('Delete route?', `"${r.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/routes/${r._id}`);
            routes.reload(true);
          } catch (e) {
            Alert.alert('Error', errorMessage(e));
          }
        },
      },
    ]);

  const initials = user!.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const totalReports = (stats?.crowdReports ?? 0) + (stats?.delayReports ?? 0);

  return (
    <Screen>
      <Row style={{ gap: space.lg }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <T variant="h2" color="#fff">{initials}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T variant="h2">{user!.name}</T>
          <T variant="small">{user!.email}</T>
          {user!.role === 'admin' && <T variant="small" color={colors.primary}>Admin</T>}
        </View>
      </Row>

      <Row style={{ gap: space.sm }}>
        {[
          ['Reports', totalReports],
          ['Crowd', stats?.crowdReports ?? 0],
          ['Points', user!.points],
        ].map(([label, value]) => (
          <Card key={label as string} style={{ flex: 1, alignItems: 'center', padding: space.md }}>
            <T variant="h2">{value}</T>
            <T variant="small">{label}</T>
          </Card>
        ))}
      </Row>

      <SectionHeader title="Saved routes" action="+ Add" onAction={() => nav.navigate('RouteForm')} />
      {(routes.data ?? []).length === 0 ? (
        <T variant="small">{routes.loading ? 'Loading…' : 'No saved routes yet.'}</T>
      ) : (
        routes.data!.map((r) => (
          <Card key={r._id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Row style={{ gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: LINE_COLORS[r.line] }} />
                  <T style={{ fontWeight: '700' }}>{r.name}</T>
                </Row>
                <T variant="small">
                  {r.source.name} → {r.destination.name} · {LINE_NAMES[r.line]} · {r.preferredTime}
                </T>
              </View>
              <Row style={{ gap: space.md }}>
                <Ionicons name="create-outline" size={22} color={colors.primary} onPress={() => nav.navigate('RouteForm', { route: r })} />
                <Ionicons name="trash-outline" size={22} color={colors.danger} onPress={() => remove(r)} />
              </Row>
            </Row>
          </Card>
        ))
      )}

      <SectionHeader title="Appearance" />
      <Chips<ThemeMode>
        value={mode}
        onChange={setMode}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: '☀︎ Light' },
          { value: 'dark', label: '☾ Dark' },
        ]}
      />

      <SectionHeader title="Notifications" action="View all" onAction={() => nav.navigate('Notifications')} />
      <Card style={{ gap: space.md }}>
        {(
          [
            ['enabled', 'Alerts', 'Master switch for all LocalLoad alerts'],
            ['nearby', 'Trains at my nearest station', 'A verified green / yellow train reaches the station nearest to you'],
            ['crowd', 'Crowd changes', 'When a saved-route train is confirmed crowded'],
            ['delay', 'Delays', 'When a delay is confirmed on your route'],
          ] as const
        ).map(([key, title, hint]) => (
          <Row key={key} style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '600' }}>{title}</T>
              <T variant="small">{hint}</T>
            </View>
            <Switch value={settings[key] !== false} onValueChange={(v) => toggle(key, v)} disabled={key !== 'enabled' && !settings.enabled} trackColor={{ true: colors.primary }} />
          </Row>
        ))}
      </Card>

      <Button
        title="Send test notification"
        icon="notifications-outline"
        variant="ghost"
        onPress={async () => {
          const ok = await ensureNotificationPermission();
          if (!ok) return Alert.alert('Notifications are off', 'Allow notifications for Expo Go in iPhone Settings → Expo Go → Notifications.');
          await showLocalNotification('LocalLoad test 🚆', 'Notifications are working on this phone.');
        }}
      />
      {user!.role === 'admin' && <Button title="Admin · simulation controls" icon="construct-outline" variant="secondary" onPress={() => nav.navigate('Admin')} />}
      <Button title="Log out" icon="log-out-outline" variant="danger" onPress={logout} />
      <T variant="small" style={{ textAlign: 'center' }}>
        Server: {BASE_URL} · LocalLoad uses simulated train data.
      </T>
    </Screen>
  );
}
