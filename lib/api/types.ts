// Response/request shapes from docs/backend-api-requirements.md (v2) + multi-model-prediction.md (v2).

export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

// ─── Auth / config ───────────────────────────────────────────────────────────
export type ClinicianStatus = 'pending' | 'active' | 'deactivated';

export type Facility = { id: string; name: string; region?: string; prediction_enabled?: boolean };

export type Clinician = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  license_number: string;
  status: ClinicianStatus;
  facility: Facility;
};

export type ClinicianRef = { id: string; full_name: string };

export type SignUpPayload = {
  full_name: string;
  email: string;
  phone_number: string;
  license_number: string;
  facility_id: string;
  password: string;
  password2: string;
};

export type LoginPayload = { email: string; password: string };

export type AuthResponse = {
  access: string;
  refresh: string;
  accessTokenExpiresAt?: number;
  refreshTokenExpiresAt?: number;
  user?: Clinician;
};

export type LabKey = 'hgb' | 'wbc' | 'anc' | 'platelet_count' | 'rbc' | 'mcv' | 'hct' | 'arc';

export type PredictionModelInfo = {
  id: string;
  name: string;
  is_default: boolean;
  threshold: number;
  test_metrics: { auc: number; sensitivity: number; specificity: number };
  model_hash: string;
};

export type AppConfig = {
  lab_ranges: Record<LabKey, { min: number; max: number; unit: string }>;
  flag_thresholds: Record<string, number>;
  prediction_models: PredictionModelInfo[];
};

// ─── Patients ────────────────────────────────────────────────────────────────
export type Sex = 'male' | 'female';
export type Genotype = 'HbSS' | 'HbSC' | 'HbSβ0' | 'HbSβ+' | 'other' | 'unknown';
export type BaselineSource = 'measured_pre_hu' | 'from_folder' | 'unknown';
export type FlagSeverity = 'critical' | 'warning' | 'info';

export type FlagSummary = {
  id: string;
  rule: string;
  severity: FlagSeverity;
  message: string;
  acknowledged?: boolean;
  action?: FlagAction | null;
  status?: 'active' | 'resolved_by_edit';
};

export type PatientFields = {
  folder_number: string;
  full_name: string;
  date_of_birth: string;
  sex: Sex;
  genotype: Genotype;
  phone_number?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  primary_clinician_id?: string | null;
  data_consent: boolean;
  data_consent_date?: string | null;
  research_consent: boolean;
  research_consent_date?: string | null;
  anc_flag_floor: number;
  anc_flag_floor_reason?: string | null;
  archived?: boolean;
};

export type PatientListItem = {
  id: string;
  folder_number: string;
  full_name: string;
  date_of_birth: string;
  sex: Sex;
  genotype: Genotype;
  last_visit_date?: string | null;
  active_flag_count?: number;
  baseline_missing?: boolean;
};

export type EligibilityReason = { code: string; message: string; eligible_from?: string };

export type Eligibility = {
  eligible: boolean;
  reasons: EligibilityReason[];
  reliability_note?: 'lower_reliability' | 'outside_training_age' | null;
  imputed_lab_count?: number;
};

export type ObservedResponse = { delta_hgb: number | null; meets_criterion: boolean | null };

export type PatientAnalytics = {
  visit_count: number;
  hgb: { min: number | null; max: number | null; mean: number | null; visits_meeting_criterion: number; visits_assessed: number };
  mcv: { first: number | null; latest: number | null; change: number | null };
  dose: { current_mg: number | null; current_mg_per_kg: number | null; changes: number };
  adherence: { good: number; partial: number; poor: number };
  toxicity: { flags_total: number; critical: number; by_rule: Record<string, number> };
  pain_episodes: { total: number; per_visit_avg: number | null };
  transfusions_reported: number;
};

export type PatientDetail = PatientFields & {
  id: string;
  primary_clinician?: ClinicianRef | null;
  age_years: number;
  hu: {
    baseline_hgb: number;
    baseline_source: BaselineSource;
    hu_start_date: string;
    days_on_hu: number;
    baseline_version_id: number;
  } | null;
  latest_visit: { id: string; lab_sample_date: string; hgb: number | null } | null;
  next_appointment_date: string | null;
  overdue: boolean;
  observed_response: ObservedResponse | null;
  active_flags: FlagSummary[];
  latest_prediction: PredictionRun | null;
  prediction_eligibility: Eligibility | null;
  analytics: PatientAnalytics;
};

export type Baseline = {
  baseline_hgb: number;
  baseline_source: BaselineSource;
  hu_start_date: string;
  version_id: number;
};

export type BaselinePayload = {
  baseline_hgb: number;
  baseline_source: BaselineSource;
  hu_start_date: string;
  reason?: string;
};

export type BaselineVersion = Baseline & { changed_by: ClinicianRef | null; changed_at: string; reason: string | null };

// ─── Visits ──────────────────────────────────────────────────────────────────
export type Adherence = 'good' | 'partial' | 'poor';
export type YesNoUnknown = 'yes' | 'no' | 'unknown';
export type PregnancyStatus = 'not_pregnant' | 'pregnant' | 'planning' | 'unknown';

export type VisitPayload = {
  lab_sample_date: string;
  consult_date?: string | null;
  hgb?: number | null;
  wbc?: number | null;
  anc?: number | null;
  platelet_count?: number | null;
  rbc?: number | null;
  mcv?: number | null;
  hct?: number | null;
  arc?: number | null;
  weight_kg?: number | null;
  dose_mg?: number | null;
  adherence?: Adherence | null;
  transfused_last_3_months: YesNoUnknown;
  pregnancy_status?: PregnancyStatus | null;
  contraception_counselled?: boolean;
  toxicity_nausea?: boolean;
  toxicity_vomiting?: boolean;
  toxicity_rash?: boolean;
  toxicity_fatigue?: boolean;
  toxicity_headache?: boolean;
  pain_episodes?: number | null;
  next_appointment_date?: string | null;
  note?: string;
  confirm_out_of_range?: boolean;
  confirm_duplicate?: boolean;
  edit_reason?: string;
};

export type VisitHistoryRow = {
  id: string;
  lab_sample_date: string;
  hgb: number | null;
  anc: number | null;
  platelet_count: number | null;
  delta_hgb_vs_previous: number | null;
  delta_hgb_vs_baseline: number | null;
  dose_mg: number | null;
  dose_mg_per_kg: number | null;
  dose_changed: boolean;
  previous_dose_mg: number | null;
  adherence: Adherence | null;
  transfused_last_3_months: YesNoUnknown;
  pain_episodes: number | null;
  flags: FlagSummary[];
  prediction: { predicted_class: PredictedClass; response_probability: number; status: PredictionStatus; outcome?: string | null } | null;
  edited: boolean;
  created_by: ClinicianRef | null;
};

export type Visit = Required<Pick<VisitPayload, 'lab_sample_date' | 'transfused_last_3_months'>> &
  Omit<VisitPayload, 'confirm_out_of_range' | 'confirm_duplicate' | 'edit_reason'> & {
    id: string;
    patient_id: string;
    dose_mg_per_kg: number | null;
    flags: FlagSummary[];
    deltas: Partial<Record<LabKey, number | null>>;
    observed_response: ObservedResponse | null;
    prediction: PredictionRun | null;
    created_by: ClinicianRef | null;
    created_at: string;
  };

export type TrendPoint = { date: string; value: number; visit_id: string };
export type TrendsResponse = {
  series: Partial<Record<string, TrendPoint[]>>;
  reference_lines: Partial<Record<string, { label: string; value: number }[]>>;
  events: { date: string; type: 'dose_change' | 'baseline_change' | 'transfusion' | 'flag'; label: string }[];
};

// ─── Flags ───────────────────────────────────────────────────────────────────
export type FlagAction = 'hold_hu' | 'repeat_fbc' | 'refer' | 'no_action' | 'other';

export type FlagListItem = {
  id: string;
  severity: FlagSeverity;
  message: string;
  patient: { id: string; full_name: string; folder_number: string };
  visit_id: string;
  created_at: string;
};

// ─── Predictions (multi-model v2) ────────────────────────────────────────────
export type PredictedClass = 'responder' | 'non_responder';
export type PredictionStatus = 'current' | 'outdated';

export type ModelResult =
  | {
      id: string;
      model: string;
      model_name: string;
      response_probability: number;
      predicted_class: PredictedClass;
      threshold: number;
      model_hash: string;
      correct?: boolean | null;
      error?: undefined;
    }
  | { model: string; model_name: string; error: { code: string; detail: string } };

export type PredictionRun = {
  run_id: string;
  visit_id: string;
  status: PredictionStatus;
  imputed_lab_count: number;
  reliability_note: Eligibility['reliability_note'];
  observed_response: ObservedResponse | null;
  results: ModelResult[];
  agreement: { responder_votes: number; of: number; all_agree: boolean };
  observed_outcome?: { next_visit_id: string; delta_hgb: number; meets_criterion: boolean; assessable: boolean } | null;
  created_at: string;
  created_by: string | ClinicianRef;
};
