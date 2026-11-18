import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { tokenStorage } from './tokenStorage';

/**
 * API base URL:
 *  1. EXPO_PUBLIC_API_URL from mobile/.env, else
 *  2. the computer running the Expo dev server (same LAN IP) on port 4000.
 */
function resolveBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:4000`;
}

export const BASE_URL = resolveBaseUrl();

export const api = axios.create({ baseURL: `${BASE_URL}/api`, timeout: 10000 });

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Turn any API/network error into a readable message. */
export function errorMessage(err: unknown): string {
  const e = err as AxiosError<{ error?: string }>;
  if (e?.response?.data?.error) return e.response.data.error;
  if (e?.code === 'ECONNABORTED') return 'The server took too long to respond.';
  if (e?.message === 'Network Error') return `Cannot reach the LocalLoad server at ${BASE_URL}. Is it running?`;
  return e?.message || 'Something went wrong';
}
