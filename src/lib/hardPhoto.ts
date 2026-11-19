import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * Opens the photo library and returns a local URI. Nothing is uploaded.
 * Returns null when the person cancels, permission is denied, or the picker fails
 * (the screen then falls back to a local file input on web).
 */
export async function pickProgressPhoto(): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return null;
    return result.assets[0]?.uri ?? null;
  } catch {
    return null;
  }
}
