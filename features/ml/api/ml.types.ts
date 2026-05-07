export type HUBaseline = {
  id: number;
  baseline_hgb: string;
  hu_start_date: string;
  created_at: string;
  updated_at: string;
};

export type SetHUBaselinePayload = {
  baseline_hgb: number;
  hu_start_date: string;
};

export type PredictResponse = {
  id: string;
  visit_id: string;
  response_probability: number;
  predicted_class: 'responder' | 'non_responder';
  model_version: string;
  target_definition: string;
  threshold: number;
  threshold_type: string;
};

export type LatestPrediction = PredictResponse & {
  created_at: string;
};
