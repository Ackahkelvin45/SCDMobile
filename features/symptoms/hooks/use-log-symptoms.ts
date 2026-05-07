import { useMutation } from '@tanstack/react-query';
import { logSymptoms } from '@/features/symptoms/api';

export function useLogSymptoms() {
  return useMutation({ mutationFn: logSymptoms });
}
