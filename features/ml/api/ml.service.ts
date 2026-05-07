import { API_ENDPOINTS, httpClient } from '@/lib/api';
import type { HUBaseline, LatestPrediction, PredictResponse, SetHUBaselinePayload } from './ml.types';

export function getHUBaseline(): Promise<HUBaseline> {
  return httpClient.get<HUBaseline>(API_ENDPOINTS.ml.huBaseline);
}

export function setHUBaseline(payload: SetHUBaselinePayload): Promise<HUBaseline> {
  return httpClient.post<HUBaseline, SetHUBaselinePayload>(API_ENDPOINTS.ml.huBaseline, payload);
}

export function predictHUResponse(visitId: string): Promise<PredictResponse> {
  return httpClient.post<PredictResponse>(API_ENDPOINTS.ml.predict, { visit_id: visitId });
}

export function getLatestPrediction(): Promise<LatestPrediction> {
  return httpClient.get<LatestPrediction>(API_ENDPOINTS.ml.latestPrediction);
}
