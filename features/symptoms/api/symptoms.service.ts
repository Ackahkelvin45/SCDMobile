import { API_ENDPOINTS, httpClient } from '@/lib/api';
import { LogSymptomsPayload, SymptomLog } from './symptoms.types';

export function logSymptoms(payload: LogSymptomsPayload): Promise<SymptomLog> {
  return httpClient.post<SymptomLog, LogSymptomsPayload>(API_ENDPOINTS.symptoms.log, payload);
}
