import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * The LLM API key never enters the zustand blob. On iOS/Android it lives in the Keychain/Keystore via
 * expo-secure-store; the web build has no secure enclave, so it falls back to AsyncStorage (localStorage).
 */
const KEY = 'glowup.ai.apiKey';
const isWeb = Platform.OS === 'web';

export async function getApiKey(): Promise<string | null> {
  try {
    return isWeb ? await AsyncStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(value: string): Promise<void> {
  const clean = value.trim();
  if (!clean) return clearApiKey();
  if (isWeb) await AsyncStorage.setItem(KEY, clean);
  else await SecureStore.setItemAsync(KEY, clean);
}

export async function clearApiKey(): Promise<void> {
  try {
    if (isWeb) await AsyncStorage.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Nothing stored is the same as cleared.
  }
}

export function maskKey(key: string): string {
  return key.length <= 8 ? '••••' : `${key.slice(0, 3)}••••${key.slice(-4)}`;
}
