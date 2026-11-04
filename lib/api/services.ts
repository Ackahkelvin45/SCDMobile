import { ApiError } from '@/lib/api/api-error';
import { API_ENDPOINTS as E } from '@/lib/api/endpoints';
import { httpClient as http } from '@/lib/api/http-client';
import { tokenStore } from '@/lib/api/token-store';
import type {
  AppConfig, AuthResponse, Baseline, BaselinePayload, BaselineVersion, Clinician, ClinicianRef, Eligibility,
  Facility, FlagAction, FlagListItem, LoginPayload, Paginated, PatientDetail, PatientFields, PatientListItem,
  PredictionRun, SignUpPayload, TrendsResponse, Visit, VisitHistoryRow, VisitPayload,
} from '@/lib/api/types';

const noAuth = { retryOnAuthError: false, skipAuth: true } as const;

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await http.post<AuthResponse>(E.auth.login, payload, noAuth);
  await tokenStore.setTokens({
    accessToken: res.access,
    refreshToken: res.refresh,
    accessTokenExpiresAt: res.accessTokenExpiresAt,
    refreshTokenExpiresAt: res.refreshTokenExpiresAt,
  });
  return res;
}

export const signUp = (p: SignUpPayload) => http.post<Clinician>(E.auth.register, p, noAuth);
export const getMe = () => http.get<Clinician>(E.auth.me);
export const updateMe = (p: Pick<Clinician, 'full_name' | 'phone_number'>) => http.patch<Clinician>(E.auth.me, p);
export const changePassword = (p: { old_password: string; new_password: string; new_password2: string }) =>
  http.post<void>(E.auth.passwordChange, p);

export async function logout(): Promise<void> {
  try {
    const tokens = await tokenStore.getTokens();
    if (tokens?.refreshToken) {
      await http.post<void>(E.auth.logout, { refresh: tokens.refreshToken }, { retryOnAuthError: false });
    }
  } catch (error) {
    // Server session already gone (400/401) is fine; anything else still signs out locally.
    if (!(error instanceof ApiError)) console.warn('[auth] logout request failed', error);
  } finally {
    await tokenStore.clearTokens();
  }
}

export const getFacilities = () => http.get<Facility[]>(E.facilities, noAuth);
export const getClinicians = () => http.get<ClinicianRef[]>(E.clinicians);
export const getConfig = () => http.get<AppConfig>(E.config);

// ─── Patients ────────────────────────────────────────────────────────────────
export type PatientListParams = {
  search?: string;
  has_flags?: boolean;
  baseline_missing?: boolean;
  ordering?: '-last_visit_date' | 'full_name';
  limit?: number;
  offset?: number;
};

export const listPatients = (params?: PatientListParams) =>
  http.get<Paginated<PatientListItem>>(E.patients.list, { params });
export const getPatient = (id: string, period: '6m' | '12m' | 'all' = 'all') =>
  http.get<PatientDetail>(E.patients.detail(id), { params: { period } });
export const createPatient = (p: PatientFields & { confirm_duplicate?: boolean }) =>
  http.post<PatientDetail>(E.patients.list, p);
export const updatePatient = (id: string, p: Partial<PatientFields>) =>
  http.patch<PatientDetail>(E.patients.detail(id), p);

export const getBaseline = (patientId: string) => http.get<Baseline>(E.patients.baseline(patientId));
export const saveBaseline = (patientId: string, p: BaselinePayload) =>
  http.put<Baseline>(E.patients.baseline(patientId), p);
export const getBaselineHistory = (patientId: string) =>
  http.get<BaselineVersion[]>(E.patients.baselineHistory(patientId));

// ─── Visits ──────────────────────────────────────────────────────────────────
export const listVisits = (patientId: string, params?: { limit?: number; offset?: number }) =>
  http.get<Paginated<VisitHistoryRow>>(E.patients.visits(patientId), { params });
export const createVisit = (patientId: string, p: VisitPayload) => http.post<Visit>(E.patients.visits(patientId), p);
export const getVisit = (id: string) => http.get<Visit>(E.visits.detail(id));
export const updateVisit = (id: string, p: Partial<VisitPayload> & { edit_reason: string }) =>
  http.patch<Visit>(E.visits.detail(id), p);
export const getTrends = (patientId: string, labs: string[], range?: { from?: string; to?: string }) =>
  http.get<TrendsResponse>(E.patients.trends(patientId), { params: { labs: labs.join(','), ...range } });

// ─── Flags ───────────────────────────────────────────────────────────────────
export const listOpenFlags = () =>
  http.get<Paginated<FlagListItem>>(E.flags.list, { params: { acknowledged: false } });
export const acknowledgeFlag = (id: string, p: { action: FlagAction; note?: string }) =>
  http.post<void>(E.flags.acknowledge(id), p);

// ─── Prediction ──────────────────────────────────────────────────────────────
export const getEligibility = (visitId: string) => http.get<Eligibility>(E.visits.eligibility(visitId));
export const predict = (visitId: string, override_reason?: string) =>
  http.post<PredictionRun>(E.visits.predict(visitId), override_reason ? { override_reason } : {});
export const listPredictions = (patientId: string) =>
  http.get<Paginated<PredictionRun>>(E.patients.predictions(patientId));
