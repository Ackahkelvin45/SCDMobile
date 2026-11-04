import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { ApiError, AuthTokens, tokenStore } from '@/lib/api';
import * as api from '@/lib/api/services';
import type { BaselinePayload, FlagAction, PatientFields, VisitPayload } from '@/lib/api/types';
import { queryKeys as K } from '@/lib/react-query/query-keys';

const no404Retry = (count: number, error: unknown) =>
  !(error instanceof ApiError && (error.status === 404 || error.status === 401)) && count < 2;

// ─── Session ─────────────────────────────────────────────────────────────────
export function useAuthSession() {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    tokenStore.getTokens().then((t) => {
      if (!active) return;
      setTokens(t);
      setIsReady(true);
    });
    const unsubscribe = tokenStore.subscribe((t) => {
      setTokens(t);
      setIsReady(true);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { isAuthenticated: Boolean(tokens?.accessToken), isReady };
}

function useAuthed() {
  const { isAuthenticated, isReady } = useAuthSession();
  return isReady && isAuthenticated;
}

// ─── Auth / account ──────────────────────────────────────────────────────────
export function useMe() {
  const enabled = useAuthed();
  return useQuery({ enabled, queryKey: K.me, queryFn: api.getMe });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.login,
    onSuccess: (res) => {
      if (res.user) qc.setQueryData(K.me, res.user);
      else qc.invalidateQueries({ queryKey: K.me });
    },
  });
}

export const useSignUp = () => useMutation({ mutationFn: api.signUp });

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.logout, onSettled: () => qc.clear() });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.updateMe, onSuccess: (me) => qc.setQueryData(K.me, me) });
}

export const useChangePassword = () => useMutation({ mutationFn: api.changePassword });

export const useFacilities = () =>
  useQuery({ queryKey: K.facilities, queryFn: api.getFacilities, staleTime: 1000 * 60 * 60 });

export function useClinicians() {
  const enabled = useAuthed();
  return useQuery({ enabled, queryKey: K.clinicians, queryFn: api.getClinicians, staleTime: 1000 * 60 * 10 });
}

export function useConfig() {
  const enabled = useAuthed();
  return useQuery({ enabled, queryKey: K.config, queryFn: api.getConfig, staleTime: 1000 * 60 * 60 });
}

/** Prediction UI is hidden entirely unless the clinician's facility has it switched on. */
export function usePredictionEnabled(): boolean {
  return Boolean(useMe().data?.facility?.prediction_enabled);
}

// ─── Patients ────────────────────────────────────────────────────────────────
export function usePatients(params: api.PatientListParams) {
  const enabled = useAuthed();
  return useQuery({ enabled, queryKey: K.patientList(params), queryFn: () => api.listPatients(params) });
}

export function usePatient(id: string | undefined, period: '6m' | '12m' | 'all' = 'all') {
  const enabled = useAuthed() && !!id;
  return useQuery({
    enabled,
    queryKey: K.patientDetail(id ?? '', period),
    queryFn: () => api.getPatient(id!, period),
    placeholderData: keepPreviousData, // period switch keeps old numbers visible while loading
    retry: no404Retry,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createPatient,
    onSuccess: () => qc.invalidateQueries({ queryKey: K.patients }),
  });
}

export function useUpdatePatient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Partial<PatientFields>) => api.updatePatient(id, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: K.patients }),
  });
}

export function useBaseline(patientId: string | undefined) {
  const enabled = useAuthed() && !!patientId;
  return useQuery({
    enabled,
    queryKey: K.baseline(patientId ?? ''),
    queryFn: () => api.getBaseline(patientId!),
    retry: no404Retry,
  });
}

export function useBaselineHistory(patientId: string | undefined) {
  const enabled = useAuthed() && !!patientId;
  return useQuery({
    enabled,
    queryKey: K.baselineHistory(patientId ?? ''),
    queryFn: () => api.getBaselineHistory(patientId!),
  });
}

export function useSaveBaseline(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: BaselinePayload) => api.saveBaseline(patientId, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: K.patient(patientId) }),
  });
}

// ─── Visits ──────────────────────────────────────────────────────────────────
export function useVisits(patientId: string | undefined, limit = 50) {
  const enabled = useAuthed() && !!patientId;
  return useQuery({
    enabled,
    queryKey: [...K.visits(patientId ?? ''), limit],
    queryFn: () => api.listVisits(patientId!, { limit }),
  });
}

export function useVisit(id: string | undefined) {
  const enabled = useAuthed() && !!id;
  return useQuery({ enabled, queryKey: K.visit(id ?? ''), queryFn: () => api.getVisit(id!), retry: no404Retry });
}

function useInvalidateAfterVisitChange() {
  const qc = useQueryClient();
  // A visit change can move flags, deltas, analytics and predictions anywhere in the patient's data.
  return (visitId: string) => {
    qc.invalidateQueries({ queryKey: K.patients });
    qc.invalidateQueries({ queryKey: K.openFlags });
    qc.invalidateQueries({ queryKey: K.visit(visitId) });
  };
}

export function useCreateVisit(patientId: string) {
  const invalidate = useInvalidateAfterVisitChange();
  return useMutation({
    mutationFn: (p: VisitPayload) => api.createVisit(patientId, p),
    onSuccess: (visit) => invalidate(visit.id),
  });
}

export function useUpdateVisit(visitId: string) {
  const invalidate = useInvalidateAfterVisitChange();
  return useMutation({
    mutationFn: (p: Partial<VisitPayload> & { edit_reason: string }) => api.updateVisit(visitId, p),
    onSuccess: () => invalidate(visitId),
  });
}

export function useTrends(patientId: string | undefined, labs: string[], from?: string) {
  const enabled = useAuthed() && !!patientId;
  const key = `${labs.join(',')}|${from ?? 'all'}`;
  return useQuery({
    enabled,
    queryKey: K.trends(patientId ?? '', key),
    queryFn: () => api.getTrends(patientId!, labs, from ? { from } : undefined),
    placeholderData: keepPreviousData, // period switch keeps the old charts visible while loading
  });
}

// ─── Flags ───────────────────────────────────────────────────────────────────
export function useOpenFlags() {
  const enabled = useAuthed();
  return useQuery({ enabled, queryKey: K.openFlags, queryFn: api.listOpenFlags });
}

export function useAcknowledgeFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: FlagAction; note?: string }) =>
      api.acknowledgeFlag(id, { action, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.openFlags });
      qc.invalidateQueries({ queryKey: K.patients });
      qc.invalidateQueries({ queryKey: ['visits'] });
    },
  });
}

// ─── Prediction ──────────────────────────────────────────────────────────────
export function useEligibility(visitId: string | undefined, enabledFlag = true) {
  const enabled = useAuthed() && !!visitId && enabledFlag;
  return useQuery({ enabled, queryKey: K.eligibility(visitId ?? ''), queryFn: () => api.getEligibility(visitId!) });
}

export function usePredict(visitId: string, patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (override_reason?: string) => api.predict(visitId, override_reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.patient(patientId) });
      qc.invalidateQueries({ queryKey: K.visit(visitId) });
    },
  });
}

export function usePredictions(patientId: string | undefined) {
  const enabled = useAuthed() && !!patientId;
  return useQuery({ enabled, queryKey: K.predictions(patientId ?? ''), queryFn: () => api.listPredictions(patientId!) });
}
