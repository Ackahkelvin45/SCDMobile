import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logMedication } from '@/features/medications/api';
import { queryKeys } from '@/lib/react-query/query-keys';

export function useLogMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logMedication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.today });
    },
  });
}
