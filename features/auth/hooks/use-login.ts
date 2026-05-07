import { useMutation, useQueryClient } from '@tanstack/react-query';

import { login } from '@/features/auth/api';
import { queryKeys } from '@/lib/react-query/query-keys';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: async (response) => {
      if (response.user) {
        queryClient.setQueryData(queryKeys.auth.me, response.user);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}
