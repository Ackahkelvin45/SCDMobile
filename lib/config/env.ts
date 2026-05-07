import { Platform } from 'react-native';

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000';
const LOCALHOST_HOST_PATTERN = /\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/i;

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function resolveApiBaseUrl(url: string): string {
  const normalizedUrl = trimTrailingSlash(url);

  if (Platform.OS === 'android' && LOCALHOST_HOST_PATTERN.test(normalizedUrl)) {
    return normalizedUrl.replace(LOCALHOST_HOST_PATTERN, '//10.0.2.2');
  }

  return normalizedUrl;
}

const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const rawApiBaseUrl = configuredApiBaseUrl ?? DEFAULT_API_BASE_URL;
const resolvedApiBaseUrl = resolveApiBaseUrl(rawApiBaseUrl);

if (__DEV__) {
  console.log(`[api] EXPO_PUBLIC_API_BASE_URL: ${configuredApiBaseUrl ?? '(not set)'}`);
  console.log(`[api] Resolved base URL: ${resolvedApiBaseUrl}`);
}

if (!configuredApiBaseUrl && __DEV__) {
  console.warn(
    `[api] Missing EXPO_PUBLIC_API_BASE_URL. Falling back to ${DEFAULT_API_BASE_URL}.`
  );
}

export const env = {
  apiBaseUrl: resolvedApiBaseUrl,
};
