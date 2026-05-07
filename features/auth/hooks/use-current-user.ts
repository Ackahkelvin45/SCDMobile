import { useQuery } from '@tanstack/react-query';

import { getCurrentUser } from '@/features/auth/api';
import { queryKeys } from '@/lib/react-query/query-keys';

import { useAuthSession } from './use-auth-session';

type UseCurrentUserOptions = {
  enabled?: boolean;
};

export function useCurrentUser(options?: UseCurrentUserOptions) {
  const { isAuthenticated, isReady } = useAuthSession();
  const enabled = (options?.enabled ?? true) && isReady && isAuthenticated;

  return useQuery({
    enabled,
    queryFn: getCurrentUser,
    queryKey: queryKeys.auth.me,
  });
}
