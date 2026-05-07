import { API_ENDPOINTS, httpClient } from '@/lib/api';

import {
  SaveVisitPayload,
  TrendsResponse,
  Visit,
  VisitListResponse,
} from './visits.types';

export function saveVisit(payload: SaveVisitPayload): Promise<Visit> {
  return httpClient.post<Visit, SaveVisitPayload>(API_ENDPOINTS.visits.list, payload);
}

export function getVisit(id: string): Promise<Visit> {
  return httpClient.get<Visit>(`/visits/${id}/`);
}

export function getLatestVisit(): Promise<Visit> {
  return httpClient.get<Visit>(API_ENDPOINTS.visits.latest);
}

export function getVisitList(params?: {
  limit?: number;
  offset?: number;
}): Promise<VisitListResponse> {
  return httpClient.get<VisitListResponse>(API_ENDPOINTS.visits.list, { params });
}

export function getVisitTrends(days = 7): Promise<TrendsResponse> {
  return httpClient.get<TrendsResponse>(API_ENDPOINTS.visits.trends, {
    params: { days },
  });
}
