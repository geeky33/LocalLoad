import { NavigatorScreenParams } from '@react-navigation/native';
import { SavedRoute } from '../types';

export type TabParamList = {
  Home: undefined;
  Track: { q?: string; from?: string } | undefined;
  Report: { instanceId?: string; trainId?: string; stationId?: string } | undefined;
  Insights: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Tracking: { instanceId: string; trainId: string; name?: string };
  RouteForm: { route?: SavedRoute } | undefined;
  Notifications: undefined;
  Admin: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
};
