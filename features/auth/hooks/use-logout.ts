import { useMutation, useQueryClient } from '@tanstack/react-query';

import { logout } from '@/features/auth/api';

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
