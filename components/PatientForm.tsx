// Shared add/edit patient form (spec US2.1/US2.4). Screens own the API call; this owns field state and validation.
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Checkbox, Chip, DateField, Screen, SectionTitle, Segmented, TextField, ui } from '@/components/ui';
import { GENOTYPES } from '@/constants/clinical';
import { C } from '@/constants/theme';
import { useClinicians } from '@/hooks/api';
import type { Genotype, PatientFields, Sex } from '@/lib/api/types';
import { toIsoDate } from '@/lib/clinical';

type FormState = {
  folder_number: string;
  full_name: string;
  date_of_birth: string | null;
  sex: Sex | null;
  genotype: Genotype | null;
  phone_number: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  primary_clinician_id: string | null;
  data_consent: boolean;
  data_consent_date: string | null;
  research_consent: boolean;
  research_consent_date: string | null;
  anc_flag_floor: '2.0' | '1.25';
  anc_flag_floor_reason: string;
};

const EMPTY: FormState = {
  folder_number: '', full_name: '', date_of_birth: null, sex: null, genotype: null,
  phone_number: '', next_of_kin_name: '', next_of_kin_phone: '', primary_clinician_id: null,
  data_consent: false, data_consent_date: null, research_consent: false, research_consent_date: null,
  anc_flag_floor: '2.0', anc_flag_floor_reason: '',
};

export function patientToForm(p: PatientFields): FormState {
  return {
    folder_number: p.folder_number ?? '',
    full_name: p.full_name ?? '',
    date_of_birth: p.date_of_birth ?? null,
    sex: p.sex ?? null,
    genotype: p.genotype ?? null,
    phone_number: p.phone_number ?? '',
    next_of_kin_name: p.next_of_kin_name ?? '',
    next_of_kin_phone: p.next_of_kin_phone ?? '',
    primary_clinician_id: p.primary_clinician_id ?? null,
    data_consent: !!p.data_consent,
    data_consent_date: p.data_consent_date ?? null,
    research_consent: !!p.research_consent,
    research_consent_date: p.research_consent_date ?? null,
    anc_flag_floor: p.anc_flag_floor === 1.25 ? '1.25' : '2.0',
    anc_flag_floor_reason: p.anc_flag_floor_reason ?? '',
  };
}

/** Normalised payload. Call only after validate() passed, so required fields are set. */
export function formToFields(f: FormState): PatientFields {
  const low = f.anc_flag_floor === '1.25';
  return {
    folder_number: f.folder_number.trim(),
    full_name: f.full_name.trim(),
    date_of_birth: f.date_of_birth ?? '',
    sex: f.sex as Sex,
    genotype: f.genotype as Genotype,
    phone_number: f.phone_number.trim(),
    next_of_kin_name: f.next_of_kin_name.trim(),
    next_of_kin_phone: f.next_of_kin_phone.trim(),
    primary_clinician_id: f.primary_clinician_id,
    data_consent: f.data_consent,
    data_consent_date: f.data_consent ? f.data_consent_date : null,
    research_consent: f.research_consent,
    research_consent_date: f.research_consent ? f.research_consent_date : null,
    anc_flag_floor: low ? 1.25 : 2.0,
    anc_flag_floor_reason: low ? f.anc_flag_floor_reason.trim() : null,
  };
}

function validate(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.folder_number.trim()) e.folder_number = 'Enter the folder number.';
  if (!f.full_name.trim()) e.full_name = 'Enter the full name.';
  if (!f.date_of_birth) e.date_of_birth = 'Select the date of birth.';
  if (!f.sex) e.sex = 'Select sex.';
  if (!f.genotype) e.genotype = 'Select genotype.';
  if (!f.data_consent) e.data_consent = 'Data-processing consent is required to save this patient.';
  if (f.anc_flag_floor === '1.25' && !f.anc_flag_floor_reason.trim()) e.anc_flag_floor_reason = 'Give a reason for the lower ANC floor.';
  return e;
}

const UNSUPPORTED = GENOTYPES.filter((g) => !g.predictionSupported).map((g) => g.label).join(' and ');

export function PatientForm({
  initial, submitLabel, submitting, serverErrors, onSubmit, header,
}: {
  initial?: PatientFields;
  submitLabel: string;
  submitting?: boolean;
  serverErrors?: Record<string, string>;
  onSubmit: (fields: PatientFields) => void;
  header?: React.ReactNode;
}) {
  const [f, setF] = useState<FormState>(() => (initial ? patientToForm(initial) : EMPTY));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clinicians = useClinicians();
  const err = { ...serverErrors, ...errors };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors(({ [k]: _, ...rest }) => rest);
  };

  const submit = () => {
    const e = validate(f);
    setErrors(e);
    if (Object.keys(e).length === 0) onSubmit(formToFields(f));
  };

  return (
    <Screen footer={<Button title={submitLabel} onPress={submit} loading={submitting} />}>
      {header}
      <Card>
        <SectionTitle title="Identity" />
        <TextField label="Folder number" value={f.folder_number} onChangeText={(v) => set('folder_number', v)}
          autoCapitalize="characters" autoCorrect={false} error={err.folder_number} />
        <TextField label="Full name" value={f.full_name} onChangeText={(v) => set('full_name', v)}
          autoCapitalize="words" autoCorrect={false} error={err.full_name} />
        <DateField label="Date of birth" value={f.date_of_birth} onChange={(v) => set('date_of_birth', v)} error={err.date_of_birth} />
        <Segmented label="Sex" value={f.sex} onChange={(v) => set('sex', v)} error={err.sex}
          options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
        <View style={{ gap: 6 }}>
          <Text style={ui.bodyBold}>Genotype</Text>
          <View style={ui.wrap}>
            {GENOTYPES.map((g) => (
              <Chip key={g.value} label={g.label} selected={f.genotype === g.value} onPress={() => set('genotype', g.value)} />
            ))}
          </View>
          {err.genotype ? <Text style={[ui.muted, { color: C.danger }]}>{err.genotype}</Text> : null}
          <Text style={ui.muted}>Prediction does not support {UNSUPPORTED} genotypes.</Text>
        </View>
      </Card>

      <Card>
        <SectionTitle title="Contact" />
        <TextField label="Phone number" value={f.phone_number} onChangeText={(v) => set('phone_number', v)}
          keyboardType="phone-pad" error={err.phone_number} />
        <TextField label="Next of kin name" value={f.next_of_kin_name} onChangeText={(v) => set('next_of_kin_name', v)}
          autoCapitalize="words" error={err.next_of_kin_name} />
        <TextField label="Next of kin phone" value={f.next_of_kin_phone} onChangeText={(v) => set('next_of_kin_phone', v)}
          keyboardType="phone-pad" error={err.next_of_kin_phone} />
      </Card>

      <Card>
        <SectionTitle title="Primary clinician (optional)" />
        {clinicians.isLoading ? <Text style={ui.muted}>Loading clinicians…</Text> : clinicians.isError ? (
          <Text style={ui.muted}>Couldn&apos;t load clinicians. You can set this later.</Text>
        ) : (
          // ponytail: chips are fine for a facility-sized list; switch to a searchable picker if lists grow past ~20.
          <View style={ui.wrap}>
            <Chip label="None" selected={!f.primary_clinician_id} onPress={() => set('primary_clinician_id', null)} />
            {(clinicians.data ?? []).map((c) => (
              <Chip key={c.id} label={c.full_name} selected={f.primary_clinician_id === c.id} onPress={() => set('primary_clinician_id', c.id)} />
            ))}
          </View>
        )}
        {err.primary_clinician_id ? <Text style={[ui.muted, { color: C.danger }]}>{err.primary_clinician_id}</Text> : null}
      </Card>

      <Card>
        <SectionTitle title="Consent" />
        <Checkbox
          label="Data-processing consent given (required)"
          checked={f.data_consent}
          onChange={(v) => { set('data_consent', v); set('data_consent_date', v ? f.data_consent_date ?? toIsoDate(new Date()) : null); }}
        />
        {err.data_consent ? <Text style={[ui.muted, { color: C.danger }]}>{err.data_consent}</Text> : null}
        <Checkbox
          label="Research prediction consent given"
          hint="Without it the patient gets full care records, but prediction is disabled for them."
          checked={f.research_consent}
          onChange={(v) => { set('research_consent', v); set('research_consent_date', v ? f.research_consent_date ?? toIsoDate(new Date()) : null); }}
        />
      </Card>

      <Card>
        <SectionTitle title="ANC flag floor" />
        <Segmented
          value={f.anc_flag_floor}
          onChange={(v) => set('anc_flag_floor', v)}
          options={[{ value: '2.0', label: '2.0 ×10⁹/L' }, { value: '1.25', label: '1.25 ×10⁹/L' }]}
        />
        {f.anc_flag_floor === '1.25' ? (
          <TextField label="Reason for lower floor" value={f.anc_flag_floor_reason} placeholder="e.g. benign ethnic neutropenia"
            onChangeText={(v) => set('anc_flag_floor_reason', v)} error={err.anc_flag_floor_reason} />
        ) : <Text style={ui.muted}>Use 1.25 only for documented benign low neutrophil counts.</Text>}
      </Card>
    </Screen>
  );
}
