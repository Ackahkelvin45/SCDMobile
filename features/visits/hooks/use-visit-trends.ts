import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/hooks';
import { getVisitTrends } from '@/features/visits/api';
import { queryKeys } from '@/lib/react-query/query-keys';

export function useVisitTrends(days = 7) {
  const { isAuthenticated, isReady } = useAuthSession();

  return useQuery({
    enabled: isReady && isAuthenticated,
    queryKey: [...queryKeys.visits.trends, days],
    queryFn: () => getVisitTrends(days),
  });
}
