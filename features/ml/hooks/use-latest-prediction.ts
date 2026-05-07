import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/hooks';
import { getLatestPrediction } from '@/features/ml/api/ml.service';
import { ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/react-query/query-keys';

export function useLatestPrediction() {
  const { isAuthenticated, isReady } = useAuthSession();

  return useQuery({
    enabled: isReady && isAuthenticated,
    queryKey: queryKeys.ml.latestPrediction,
    queryFn: getLatestPrediction,
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}
