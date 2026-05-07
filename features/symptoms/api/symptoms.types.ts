export type PainLocation = 'chest' | 'abdomen' | 'back' | 'joints' | 'head' | 'other';

export type LogSymptomsPayload = {
  pain_level: number;
  pain_location: PainLocation;
  stress_level: number;
  hydration_level: number;
  fatigue?: boolean;
  shortness_of_breath?: boolean;
  dizziness?: boolean;
  fever?: boolean;
  jaundice?: boolean;
  swelling?: boolean;
};

export type SymptomLog = LogSymptomsPayload & {
  id: number;
  logged_at: string;
};
