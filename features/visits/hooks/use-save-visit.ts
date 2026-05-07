import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveVisit } from '@/features/visits/api';
import { queryKeys } from '@/lib/react-query/query-keys';

export function useSaveVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveVisit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.latest });
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.trends });
    },
  });
}
