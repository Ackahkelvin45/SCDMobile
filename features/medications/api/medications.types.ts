export type LogMedicationPayload = {
  hu_taken: boolean;
  dose_mg?: number | null;
  date?: string;
  notes?: string;
};

export type MedicationLog = {
  id: number;
  date: string;
  hu_taken: boolean;
  dose_mg: number | null;
  notes: string | null;
  logged_at: string;
};

export type TodayMedicationResponse =
  | { logged: false; date: string }
  | ({ logged: true } & MedicationLog);
