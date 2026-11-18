import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Loading } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { NearestStationProvider } from '../context/NearestStationContext';
import { useTheme } from '../context/ThemeContext';
import { useRouteAlerts } from '../hooks/useRouteAlerts';
import { ensureNotificationPermission } from '../services/notifications';
import AdminScreen from '../screens/AdminScreen';
import HomeScreen from '../screens/HomeScreen';
import InsightsScreen from '../screens/InsightsScreen';
import LoginScreen from '../screens/LoginScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ReportScreen from '../screens/ReportScreen';
import RouteFormScreen from '../screens/RouteFormScreen';
import SignupScreen from '../screens/SignupScreen';
import TrackingScreen from '../screens/TrackingScreen';
import TrackScreen from '../screens/TrackScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { AppStackParamList, AuthStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const TAB_ICONS: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Track: ['train', 'train-outline'],
  Report: ['add-circle', 'add-circle-outline'],
  Insights: ['bar-chart', 'bar-chart-outline'],
  Profile: ['person', 'person-outline'],
};

function Tabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Track" component={TrackScreen} />
      <Tab.Screen name="Report" component={ReportScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function SignedIn() {
  const { colors } = useTheme();
  useRouteAlerts();
  useEffect(() => {
    ensureNotificationPermission();
  }, []);
  const header = {
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.text,
    headerShadowVisible: false,
  };
  return (
    <NearestStationProvider>
    <AppStack.Navigator screenOptions={header}>
      <AppStack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <AppStack.Screen name="Tracking" component={TrackingScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="RouteForm" component={RouteFormScreen} options={{ title: 'Daily route', presentation: 'modal' }} />
      <AppStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <AppStack.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin · Dev tools' }} />
    </AppStack.Navigator>
    </NearestStationProvider>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <Loading text="Starting LocalLoad…" />;
  if (user) return <SignedIn />;
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}
