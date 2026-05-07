import { ApiError } from '@/lib/api/api-error';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { tokenStore } from '@/lib/api/token-store';
import { env } from '@/lib/config/env';

type Primitive = string | number | boolean | null | undefined;
type QueryParams = Record<string, Primitive>;

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  method?: RequestMethod;
  params?: QueryParams;
  retryOnAuthError?: boolean;
  signal?: AbortSignal;
  skipAuth?: boolean;
};

type RequestWithoutMethodBody = Omit<RequestOptions, 'body' | 'method'>;

let refreshInFlight: Promise<string | null> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function buildUrl(path: string, params?: QueryParams): string {
  const absolutePath = /^https?:\/\//i.test(path)
    ? path
    : `${env.apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  const url = new URL(absolutePath);

  if (!params) {
    return url.toString();
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

function normalizeBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob
  ) {
    return body;
  }

  return JSON.stringify(body);
}

async function parseResponse(response: Response): Promise<unknown> {
  const responseText = await response.text();

  if (!responseText) {
    return undefined;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (typeof payload.detail === 'string') {
    return payload.detail;
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  if (Array.isArray(payload.message) && typeof payload.message[0] === 'string') {
    return payload.message[0];
  }

  if (typeof payload.error === 'string') {
    return payload.error;
  }

  return undefined;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const tokens = await tokenStore.getTokens();

    if (!tokens?.refreshToken) {
      return null;
    }

    const refreshResponse = await fetch(buildUrl(API_ENDPOINTS.auth.refresh), {
      body: JSON.stringify({ refresh: tokens.refreshToken }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    const payload = await parseResponse(refreshResponse);

    if (!refreshResponse.ok) {
      throw new ApiError(
        extractErrorMessage(payload) ?? 'Unable to refresh access token.',
        refreshResponse.status,
        payload
      );
    }

    if (!isRecord(payload) || typeof payload.access !== 'string') {
      throw new ApiError('Refresh endpoint returned an invalid payload.', refreshResponse.status, payload);
    }

    const nextTokens = {
      accessToken: payload.access,
      accessTokenExpiresAt:
        typeof payload.accessTokenExpiresAt === 'number'
          ? payload.accessTokenExpiresAt
          : tokens.accessTokenExpiresAt,
      refreshToken:
        typeof payload.refresh === 'string' ? payload.refresh : tokens.refreshToken,
      refreshTokenExpiresAt:
        typeof payload.refreshTokenExpiresAt === 'number'
          ? payload.refreshTokenExpiresAt
          : tokens.refreshTokenExpiresAt,
    };

    await tokenStore.setTokens(nextTokens);

    return nextTokens.accessToken;
  })()
    .catch(async (error) => {
      await tokenStore.clearTokens();
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  hasRetried = false
): Promise<T> {
  const {
    body,
    headers,
    method = 'GET',
    params,
    retryOnAuthError = true,
    signal,
    skipAuth = false,
  } = options;
  const tokens = await tokenStore.getTokens();
  const normalizedBody = normalizeBody(body);
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (
    normalizedBody &&
    !(normalizedBody instanceof FormData) &&
    !requestHeaders['Content-Type'] &&
    !requestHeaders['content-type']
  ) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (!skipAuth && tokens?.accessToken) {
    requestHeaders.Authorization = `Bearer ${tokens.accessToken}`;
  }

  const requestUrl = buildUrl(path, params);

  if (__DEV__) {
    console.log(`[api] ${method} ${requestUrl}`);
  }

  let response: Response;

  try {
    response = await fetch(requestUrl, {
      body: normalizedBody,
      headers: requestHeaders,
      method,
      signal,
    });
  } catch (error) {
    if (__DEV__) {
      console.log(`[api] Network error for ${method} ${requestUrl}`, error);
    }

    throw error;
  }

  if (__DEV__) {
    console.log(`[api] ${method} ${requestUrl} -> ${response.status}`);
  }

  if (response.status === 401 && !skipAuth && retryOnAuthError && !hasRetried) {
    const refreshedToken = await refreshAccessToken();

    if (refreshedToken) {
      return request<T>(path, options, true);
    }
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    if (__DEV__) {
      console.log(`[api] ${method} ${requestUrl} error body:`, JSON.stringify(payload, null, 2));
    }
    throw new ApiError(
      extractErrorMessage(payload) ?? `Request failed with status ${response.status}.`,
      response.status,
      payload
    );
  }

  return payload as T;
}

export const httpClient = {
  delete<T>(path: string, options?: RequestWithoutMethodBody): Promise<T> {
    return request<T>(path, { ...options, method: 'DELETE' });
  },
  get<T>(path: string, options?: RequestWithoutMethodBody): Promise<T> {
    return request<T>(path, { ...options, method: 'GET' });
  },
  patch<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: RequestWithoutMethodBody
  ): Promise<TResponse> {
    return request<TResponse>(path, { ...options, body, method: 'PATCH' });
  },
  post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: RequestWithoutMethodBody
  ): Promise<TResponse> {
    return request<TResponse>(path, { ...options, body, method: 'POST' });
  },
  put<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: RequestWithoutMethodBody
  ): Promise<TResponse> {
    return request<TResponse>(path, { ...options, body, method: 'PUT' });
  },
  request,
};
