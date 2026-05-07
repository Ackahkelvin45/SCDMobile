import { API_ENDPOINTS, httpClient, tokenStore } from '@/lib/api';
import { ApiError } from '@/lib/api/api-error';

import { AuthResponse, LoginPayload, RegisterPayload, RegisterResponse, UserProfile } from './auth.types';

function saveAuthTokens(response: AuthResponse): Promise<void> {
  return tokenStore.setTokens({
    accessToken: response.access,
    accessTokenExpiresAt: response.accessTokenExpiresAt,
    refreshToken: response.refresh,
    refreshTokenExpiresAt: response.refreshTokenExpiresAt,
  });
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await httpClient.post<AuthResponse, LoginPayload>(API_ENDPOINTS.auth.login, payload, {
    retryOnAuthError: false,
    skipAuth: true,
  });

  await saveAuthTokens(response);

  return response;
}

export function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return httpClient.post<RegisterResponse, RegisterPayload>(API_ENDPOINTS.auth.register, payload, {
    retryOnAuthError: false,
    skipAuth: true,
  });
}

export function getCurrentUser(): Promise<UserProfile> {
  return httpClient.get<UserProfile>(API_ENDPOINTS.auth.me);
}

export async function logout(): Promise<void> {
  try {
    const tokens = await tokenStore.getTokens();
    await httpClient.post<void>(
      API_ENDPOINTS.auth.logout,
      tokens?.refreshToken ? { refresh: tokens.refreshToken } : undefined,
      { retryOnAuthError: false }
    );
  } catch (error) {
    // 401 = token already expired; 400 = token missing/invalid on the server.
    // Either way the server session is gone — clear local tokens and move on.
    const isExpectedError =
      error instanceof ApiError && (error.status === 401 || error.status === 400);
    if (!isExpectedError) {
      throw error;
    }
  } finally {
    await tokenStore.clearTokens();
  }
}
