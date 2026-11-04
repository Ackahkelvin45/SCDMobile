export const queryKeys = {
  me: ['me'] as const,
  config: ['config'] as const,
  facilities: ['facilities'] as const,
  clinicians: ['clinicians'] as const,
  openFlags: ['flags', 'open'] as const,
  patients: ['patients'] as const, // prefix for list + every patient-scoped key
  patientList: (params: object) => ['patients', 'list', params] as const,
  patient: (id: string) => ['patients', id] as const, // prefix for everything about one patient
  patientDetail: (id: string, period: string) => ['patients', id, 'detail', period] as const,
  baseline: (id: string) => ['patients', id, 'baseline'] as const,
  baselineHistory: (id: string) => ['patients', id, 'baseline-history'] as const,
  visits: (id: string) => ['patients', id, 'visits'] as const,
  trends: (id: string, labs: string) => ['patients', id, 'trends', labs] as const,
  predictions: (id: string) => ['patients', id, 'predictions'] as const,
  visit: (id: string) => ['visits', id] as const, // prefix for detail + eligibility
  eligibility: (id: string) => ['visits', id, 'eligibility'] as const,
};
