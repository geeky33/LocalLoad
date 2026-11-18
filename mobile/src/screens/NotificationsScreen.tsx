import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { RefreshControl, View } from 'react-native';
import { Card, Empty, ErrorState, Loading, Row, Screen, T } from '../components/ui';
import { space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAsync } from '../hooks/useAsync';
import { api } from '../services/api';
import { AppNotification } from '../types';
import { timeAgo } from '../utils/format';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { data, loading, error, reload } = useAsync(() => api.get<AppNotification[]>('/notifications').then((r) => r.data));

  useEffect(() => {
    if (data?.some((n) => !n.read)) api.put('/notifications/read').catch(() => {});
  }, [data]);

  return (
    <Screen edges={['bottom']} refreshControl={<RefreshControl refreshing={false} onRefresh={() => reload()} />}>
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <Empty icon="notifications-off-outline" text="No alerts yet. You'll be notified when a less-crowded train reaches your nearest station, or when 5+ commuters confirm a crowd or delay change on a saved route." />
      ) : (
        data.map((n) => (
          <Card key={n._id}>
            <Row style={{ gap: space.md, alignItems: 'flex-start' }}>
              <Ionicons
                name={n.type === 'delay' ? 'time' : n.type === 'nearby' ? 'location' : 'people'}
                size={20}
                color={n.type === 'delay' ? colors.danger : n.type === 'nearby' ? colors.crowd.green : colors.primary}
              />
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: n.read ? '500' : '800' }}>{n.title}</T>
                <T variant="small">{n.body}</T>
                <T variant="small">{timeAgo(n.createdAt)}</T>
              </View>
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
