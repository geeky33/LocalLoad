import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * The JWT is kept in the iOS Keychain / Android Keystore via expo-secure-store.
 * SecureStore is not available on web, so web falls back to AsyncStorage.
 */
const KEY = 'localload.token';
const secure = Platform.OS !== 'web';

export const tokenStorage = {
  get: () => (secure ? SecureStore.getItemAsync(KEY) : AsyncStorage.getItem(KEY)),
  set: (token: string) => (secure ? SecureStore.setItemAsync(KEY, token) : AsyncStorage.setItem(KEY, token)),
  clear: () => (secure ? SecureStore.deleteItemAsync(KEY) : AsyncStorage.removeItem(KEY)),
};
