import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/hooks';
import { getVisit } from '@/features/visits/api';

export function useVisit(id: string | undefined) {
  const { isAuthenticated, isReady } = useAuthSession();

  return useQuery({
    enabled: isReady && isAuthenticated && !!id,
    queryKey: ['visits', 'detail', id],
    queryFn: () => getVisit(id!),
  });
}
