import { API_ENDPOINTS, httpClient } from '@/lib/api';
import { LogMedicationPayload, MedicationLog, TodayMedicationResponse } from './medications.types';

export function logMedication(payload: LogMedicationPayload): Promise<MedicationLog> {
  return httpClient.post<MedicationLog, LogMedicationPayload>(API_ENDPOINTS.medications.log, payload);
}

export function getTodayMedication(): Promise<TodayMedicationResponse> {
  return httpClient.get<TodayMedicationResponse>(API_ENDPOINTS.medications.today);
}
