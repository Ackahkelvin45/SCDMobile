import { useQuery } from '@tanstack/react-query';
import { getTodayMedication } from '@/features/medications/api';
import { queryKeys } from '@/lib/react-query/query-keys';
import { useAuthSession } from '@/features/auth/hooks';

export function useTodayMedication() {
  const { isAuthenticated, isReady } = useAuthSession();

  return useQuery({
    enabled: isReady && isAuthenticated,
    queryKey: queryKeys.medications.today,
    queryFn: getTodayMedication,
  });
}
