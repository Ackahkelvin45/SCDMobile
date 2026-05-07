import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api';

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status === 401) {
    return false;
  }

  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: shouldRetry,
      },
      queries: {
        gcTime: 1000 * 60 * 30,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
        staleTime: 1000 * 30,
      },
    },
  });
}
