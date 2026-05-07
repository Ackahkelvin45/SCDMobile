import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/hooks';
import { getLatestVisit } from '@/features/visits/api';
import { ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/react-query/query-keys';

export function useLatestVisit() {
  const { isAuthenticated, isReady } = useAuthSession();

  return useQuery({
    enabled: isReady && isAuthenticated,
    queryKey: queryKeys.visits.latest,
    queryFn: getLatestVisit,
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}
