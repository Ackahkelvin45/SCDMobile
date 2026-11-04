import type {
  Adherence, BaselineSource, FlagAction, FlagSeverity, Genotype, LabKey, PregnancyStatus, YesNoUnknown,
} from '@/lib/api/types';

/** Lab fields in the order of the analyser printout (spec §5). Units/ranges come from GET /config/. */
export const LAB_FIELDS: { key: LabKey; label: string; required?: boolean }[] = [
  { key: 'hgb', label: 'Haemoglobin (Hb)', required: true },
  { key: 'wbc', label: 'WBC' },
  { key: 'anc', label: 'ANC (neutrophils)' },
  { key: 'platelet_count', label: 'Platelets' },
  { key: 'rbc', label: 'RBC' },
  { key: 'mcv', label: 'MCV' },
  { key: 'hct', label: 'Haematocrit (Hct)' },
  { key: 'arc', label: 'ARC (absolute retics)' },
];

export const LAB_SHORT: Record<string, string> = {
  hgb: 'Hb', wbc: 'WBC', anc: 'ANC', platelet_count: 'Platelets', rbc: 'RBC', mcv: 'MCV', hct: 'Hct', arc: 'ARC',
  weight_kg: 'Weight', dose_mg_per_kg: 'Dose mg/kg', pain_episodes: 'Pain episodes',
};

export const GENOTYPES: { value: Genotype; label: string; predictionSupported: boolean }[] = [
  { value: 'HbSS', label: 'HbSS', predictionSupported: true },
  { value: 'HbSC', label: 'HbSC', predictionSupported: true },
  { value: 'HbSβ0', label: 'HbSβ⁰', predictionSupported: true },
  { value: 'HbSβ+', label: 'HbSβ⁺', predictionSupported: true },
  { value: 'other', label: 'Other', predictionSupported: false },
  { value: 'unknown', label: 'Unknown', predictionSupported: false },
];

export const BASELINE_SOURCES: { value: BaselineSource; label: string; hint: string }[] = [
  { value: 'measured_pre_hu', label: 'Measured pre-HU', hint: 'Steady-state Hb before HU started' },
  { value: 'from_folder', label: 'From folder', hint: 'Taken from the patient folder' },
  { value: 'unknown', label: 'Unknown', hint: 'Prediction will be disabled' },
];

export const ADHERENCE: { value: Adherence; label: string }[] = [
  { value: 'good', label: 'Good' },
  { value: 'partial', label: 'Partial' },
  { value: 'poor', label: 'Poor' },
];

export const YES_NO_UNKNOWN: { value: YesNoUnknown; label: string }[] = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
  { value: 'unknown', label: 'Unknown' },
];

export const PREGNANCY: { value: PregnancyStatus; label: string }[] = [
  { value: 'not_pregnant', label: 'Not pregnant' },
  { value: 'pregnant', label: 'Pregnant' },
  { value: 'planning', label: 'Planning' },
  { value: 'unknown', label: 'Unknown' },
];

export const SIDE_EFFECTS = [
  { key: 'toxicity_nausea', label: 'Nausea' },
  { key: 'toxicity_vomiting', label: 'Vomiting' },
  { key: 'toxicity_rash', label: 'Rash' },
  { key: 'toxicity_fatigue', label: 'Fatigue' },
  { key: 'toxicity_headache', label: 'Headache' },
] as const;

export const FLAG_ACTIONS: { value: FlagAction; label: string }[] = [
  { value: 'hold_hu', label: 'Hold HU' },
  { value: 'repeat_fbc', label: 'Repeat FBC' },
  { value: 'refer', label: 'Refer' },
  { value: 'no_action', label: 'No action' },
  { value: 'other', label: 'Other' },
];

export const SEVERITY_STYLE: Record<FlagSeverity, { bg: string; fg: string; label: string }> = {
  critical: { bg: '#FEE2E2', fg: '#B91C1C', label: 'Critical' },
  warning: { bg: '#FEF3C7', fg: '#92400E', label: 'Warning' },
  info: { bg: '#E0F2FE', fg: '#075985', label: 'Info' },
};

export const RELIABILITY_TEXT = {
  lower_reliability: 'Lower reliability for this group (genotype or adult age).',
  outside_training_age: 'Outside the training age range. Interpret with extra caution.',
} as const;

/** Fixed disclaimer, shown on every prediction result (spec US5.2). */
export const PREDICTION_DISCLAIMER =
  'Predicts Hb rise ≥ 1 g/dL at the next lab visit (typically 1–3 months). Not externally validated. Do not use alone to start, stop or dose HU.';

export function classLabel(c: 'responder' | 'non_responder'): string {
  return c === 'responder' ? 'likely' : 'unlikely';
}
