import * as Notifications from 'expo-notifications';

/**
 * Demo approach: the server pushes "route-alert" events over Socket.IO, and the app
 * shows them as LOCAL notifications (works in Expo Go without push credentials).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission() {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const res = await Notifications.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

export async function showLocalNotification(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {
    // notifications unavailable (e.g. web) - ignore
  }
}
