export type VisitStatus = 'STABLE' | 'MONITOR' | 'ELEVATED';

export type Visit = {
  id: string;
  visit_date: string;
  hgb: string | null;
  wbc: string | null;
  platelet_count: string | null;
  hct: string | null;
  rbc: string | null;
  mcv: string | null;
  anc: string | null;
  arc: string | null;
  toxicity_nausea: boolean;
  toxicity_vomiting: boolean;
  toxicity_rash: boolean;
  toxicity_fatigue: boolean;
  toxicity_headache: boolean;
  toxicity_neutropenia: boolean;
  pain_episodes: number;
  lab_photo_url: string | null;
  predicted_class: 'responder' | 'non_responder' | null;
  status: VisitStatus;
  created_at: string;
};

export type VisitListItem = {
  id: string;
  visit_date: string;
  hgb: string | null;
  wbc: string | null;
  pain_episodes: number;
  predicted_class: 'responder' | 'non_responder' | null;
  status: VisitStatus;
};

export type VisitListResponse = {
  count: number;
  results: VisitListItem[];
};

export type TrendDay = {
  date: string;
  day_label: string;
  pain_episodes: number | null;
  hgb: number | null;
  has_visit: boolean;
};

export type TrendsResponse = {
  days: TrendDay[];
};

export type SaveVisitPayload = {
  visit_date: string;
  hgb?: number | null;
  wbc?: number | null;
  platelet_count?: number | null;
  hct?: number | null;
  rbc?: number | null;
  mcv?: number | null;
  anc?: number | null;
  arc?: number | null;
  toxicity_nausea?: boolean;
  toxicity_vomiting?: boolean;
  toxicity_rash?: boolean;
  toxicity_fatigue?: boolean;
  toxicity_headache?: boolean;
  toxicity_neutropenia?: boolean;
  pain_episodes?: number;
  lab_photo_url?: string | null;
};
