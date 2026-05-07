import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/hooks';
import { getVisitList } from '@/features/visits/api';
import { queryKeys } from '@/lib/react-query/query-keys';

export function useVisitList(params?: { limit?: number; offset?: number }) {
  const { isAuthenticated, isReady } = useAuthSession();

  return useQuery({
    enabled: isReady && isAuthenticated,
    queryKey: [...queryKeys.visits.list, params],
    queryFn: () => getVisitList(params),
  });
}
