import * as SecureStore from 'expo-secure-store';

import { AuthTokens, TokenStorageAdapter } from './token-store';

const STORAGE_KEY = 'auth_tokens';

export const secureStorageAdapter: TokenStorageAdapter = {
  async getTokens(): Promise<AuthTokens | null> {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthTokens;
    } catch {
      return null;
    }
  },
  async setTokens(tokens: AuthTokens): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(tokens));
  },
  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  },
};
