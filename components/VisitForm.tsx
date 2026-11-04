// One scrolling visit form for create and edit (spec US4.1/US4.2, §5). Controlled: the screen owns the state (drafts).
import React, { useRef, useState } from 'react';
import {
  Alert, InputAccessoryView, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { Banner, Button, Checkbox, Chip, DateField, Loading, Screen, Segmented, TextField, ui } from '@/components/ui';
import { ADHERENCE, LAB_FIELDS, LAB_SHORT, PREGNANCY, SIDE_EFFECTS, YES_NO_UNKNOWN } from '@/constants/clinical';
import { C, Fonts } from '@/constants/theme';
import { useConfig } from '@/hooks/api';
import type { Adherence, LabKey, PregnancyStatus, Sex, Visit, VisitPayload, YesNoUnknown } from '@/lib/api/types';
import {
  arcFromRetic, formatDelta, isOutOfRange, parseNumber, pregnancyRequired, suggestUnitFix, toIsoDate,
} from '@/lib/clinical';

type SideKey = (typeof SIDE_EFFECTS)[number]['key'];

export type VisitFormState = {
  lab_sample_date: string | null;
  labs: Record<LabKey, string>;
  retic: string;
  weight_kg: string;
  dose_mg: string;
  adherence: Adherence | null;
  transfused_last_3_months: YesNoUnknown | null;
  pregnancy_status: PregnancyStatus | null;
  contraception_counselled: boolean;
  side: Partial<Record<SideKey, boolean>>;
  pain_episodes: string;
  next_appointment_date: string | null;
  note: string;
};

export type VisitFormPatient = { full_name: string; folder_number: string; sex: Sex; date_of_birth: string };

/** Values to compare against in the review step (previous visit, or the visit before editing). */
export type CompareValues = Partial<Record<LabKey | 'weight_kg' | 'dose_mg' | 'pain_episodes', number | null>>;

const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

export function emptyVisitForm(): VisitFormState {
  return {
    lab_sample_date: toIsoDate(new Date()),
    labs: { hgb: '', wbc: '', anc: '', platelet_count: '', rbc: '', mcv: '', hct: '', arc: '' },
    retic: '', weight_kg: '', dose_mg: '', adherence: null, transfused_last_3_months: null,
    pregnancy_status: null, contraception_counselled: false, side: {}, pain_episodes: '',
    next_appointment_date: null, note: '',
  };
}

export function visitToForm(v: Visit): VisitFormState {
  const f = emptyVisitForm();
  for (const { key } of LAB_FIELDS) f.labs[key] = str(v[key]);
  return {
    ...f,
    lab_sample_date: v.lab_sample_date,
    weight_kg: str(v.weight_kg),
    dose_mg: str(v.dose_mg),
    adherence: v.adherence ?? null,
    transfused_last_3_months: v.transfused_last_3_months,
    pregnancy_status: v.pregnancy_status ?? null,
    contraception_counselled: !!v.contraception_counselled,
    side: Object.fromEntries(SIDE_EFFECTS.map((s) => [s.key, !!v[s.key]])),
    pain_episodes: str(v.pain_episodes),
    next_appointment_date: v.next_appointment_date ?? null,
    note: v.note ?? '',
  };
}

// Numeric inputs in tab order; "Next" walks this list.
const NUMERIC = [...LAB_FIELDS.map((l) => l.key), 'retic', 'weight_kg', 'dose_mg', 'pain_episodes'] as const;
type NumKey = (typeof NUMERIC)[number];
const ACCESSORY_ID = 'visit-form-next';

/** ARC to send: the typed value, else computed from retic % × RBC when both are valid. */
function effectiveArc(f: VisitFormState): number | null {
  const typed = parseNumber(f.labs.arc);
  if (typed !== null) return typed;
  const retic = parseNumber(f.retic);
  const rbc = parseNumber(f.labs.rbc);
  return retic !== null && rbc !== null && !Number.isNaN(retic) && !Number.isNaN(rbc) ? arcFromRetic(retic, rbc) : null;
}

export function VisitForm({
  patient, value, onChange, mode, onSubmit, errors: serverErrors = {}, previous, previousLabel = 'Previous visit',
  baselineHgb, banner, requireReason,
}: {
  patient: VisitFormPatient;
  value: VisitFormState;
  onChange: (v: VisitFormState) => void;
  mode: 'create' | 'edit';
  /** Called after validation and the review step. Should handle its own errors (never reject). */
  onSubmit: (payload: VisitPayload) => Promise<void>;
  errors?: Record<string, string>;
  previous?: CompareValues | null;
  previousLabel?: string;
  baselineHgb?: number | null;
  banner?: React.ReactNode;
  /** Edit mode: the review sheet asks for a required reason, sent as `edit_reason`. */
  requireReason?: boolean;
}) {
  const config = useConfig();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState<VisitPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const refs = useRef<Partial<Record<NumKey, TextInput | null>>>({});
  const focused = useRef<NumKey | null>(null);

  if (config.isLoading) return <Loading />;
  const ranges = config.data?.lab_ranges;
  const unitOf = (k: LabKey) => ranges?.[k]?.unit;

  const f = value;
  const set = (patch: Partial<VisitFormState>) => onChange({ ...f, ...patch });
  const setLab = (k: LabKey, t: string) => onChange({ ...f, labs: { ...f.labs, [k]: t } });
  const err = (k: string) => errors[k] ?? serverErrors[k];
  const pregnancyShown = pregnancyRequired(patient.sex, patient.date_of_birth, f.lab_sample_date ?? undefined);

  const focusNext = (k: NumKey) => {
    const next = NUMERIC[NUMERIC.indexOf(k) + 1];
    if (next) refs.current[next]?.focus();
    else refs.current[k]?.blur();
  };

  const numProps = (k: NumKey) => ({
    ref: (r: TextInput | null) => { refs.current[k] = r; },
    keyboardType: (k === 'pain_episodes' ? 'number-pad' : 'decimal-pad') as 'number-pad' | 'decimal-pad',
    returnKeyType: (k === 'pain_episodes' ? 'done' : 'next') as 'done' | 'next',
    submitBehavior: 'submit' as const,
    onSubmitEditing: () => focusNext(k),
    onFocus: () => { focused.current = k; },
    inputAccessoryViewID: Platform.OS === 'ios' ? ACCESSORY_ID : undefined,
  });

  const arc = effectiveArc(f);
  const weight = parseNumber(f.weight_kg);
  const dose = parseNumber(f.dose_mg);
  const mgPerKg = weight && dose && !Number.isNaN(weight) && !Number.isNaN(dose) ? (dose / weight).toFixed(1) : null;

  const validate = (): { payload: VisitPayload; outOfRange: string[] } | null => {
    const e: Record<string, string> = {};
    const num = (k: string, t: string) => {
      const n = parseNumber(t);
      if (Number.isNaN(n)) { e[k] = 'Not a number'; return null; }
      return n;
    };
    const labs = {} as Record<LabKey, number | null>;
    for (const { key } of LAB_FIELDS) labs[key] = num(key, f.labs[key]);
    if (num('retic', f.retic) !== null && labs.rbc === null && labs.arc === null) e.retic = 'Enter RBC to compute ARC';
    if (labs.arc === null && !e.retic) labs.arc = arc;
    if (labs.hgb === null && !e.hgb) e.hgb = 'Hb is required';
    if (!f.lab_sample_date) e.lab_sample_date = 'Lab sample date is required';
    if (!f.transfused_last_3_months) e.transfused_last_3_months = 'Required';
    if (pregnancyShown && !f.pregnancy_status) e.pregnancy_status = 'Required for females aged 12–50';
    const weight_kg = num('weight_kg', f.weight_kg);
    const dose_mg = num('dose_mg', f.dose_mg);
    const pain = num('pain_episodes', f.pain_episodes);
    if (pain !== null && (!Number.isInteger(pain) || pain < 0)) e.pain_episodes = 'Whole number, 0 or more';
    setErrors(e);
    if (Object.keys(e).length) return null;

    const outOfRange = LAB_FIELDS.filter(({ key }) => labs[key] !== null && isOutOfRange(labs[key]!, ranges?.[key]))
      .map((l) => l.label);
    return {
      outOfRange,
      payload: {
        lab_sample_date: f.lab_sample_date!,
        ...labs,
        weight_kg, dose_mg,
        adherence: f.adherence,
        transfused_last_3_months: f.transfused_last_3_months!,
        pregnancy_status: pregnancyShown ? f.pregnancy_status : null,
        contraception_counselled: pregnancyShown ? f.contraception_counselled : false,
        ...Object.fromEntries(SIDE_EFFECTS.map((s) => [s.key, !!f.side[s.key]])),
        pain_episodes: pain,
        next_appointment_date: f.next_appointment_date,
        note: f.note.trim(),
        ...(outOfRange.length ? { confirm_out_of_range: true } : {}),
      },
    };
  };

  const startReview = () => {
    const v = validate();
    if (!v) {
      Alert.alert('Check the form', 'Some fields need attention.');
      return;
    }
    if (v.outOfRange.length) {
      Alert.alert(
        'Values outside the usual range',
        `${v.outOfRange.join(', ')} ${v.outOfRange.length > 1 ? 'are' : 'is'} outside the plausible range. Are these correct?`,
        [{ text: 'Go back', style: 'cancel' }, { text: 'Yes, correct', onPress: () => setReview(v.payload) }],
      );
    } else setReview(v.payload);
  };

  const confirm = async (reason: string) => {
    if (!review) return;
    // Close the sheet first so any Alert from onSubmit (duplicate date, errors) isn't swallowed by the dismissing modal on iOS.
    const payload = requireReason ? { ...review, edit_reason: reason } : review;
    setReview(null);
    setSubmitting(true);
    await onSubmit(payload);
    setSubmitting(false);
  };

  return (
    <View style={st.fill}>
      <View style={st.pinned}>
        <Text style={ui.h2} numberOfLines={1}>{patient.full_name}</Text>
        <Text style={ui.muted}>Folder {patient.folder_number}</Text>
      </View>
      <Screen footer={<Button title={mode === 'create' ? 'Review & save' : 'Review changes'} onPress={startReview} loading={submitting} icon="checkmark-done" />}>
        {banner}
        {config.isError ? <Banner tone="warn" text="Couldn't load lab units and ranges, so range checks are off. The server still checks values." /> : null}
        <DateField label="Lab sample date" value={f.lab_sample_date} onChange={(d) => set({ lab_sample_date: d })} error={err('lab_sample_date')} />

        <Text style={st.group}>Labs</Text>
        {LAB_FIELDS.map(({ key, label, required }) => {
          const n = parseNumber(f.labs[key]);
          const fix = n !== null && !Number.isNaN(n) ? suggestUnitFix(key, n) : null;
          const out = !fix && n !== null && !Number.isNaN(n) && isOutOfRange(n, ranges?.[key]);
          const arcHint = key === 'arc' && !f.labs.arc && arc !== null ? `${arc} (from retic %)` : undefined;
          return (
            <View key={key} style={st.labBlock}>
              <TextField
                label={required ? `${label} *` : label}
                unit={unitOf(key)}
                value={f.labs[key]}
                onChangeText={(t) => setLab(key, t)}
                placeholder={arcHint}
                error={err(key)}
                {...numProps(key)}
              />
              {fix ? (
                <View style={st.inline}>
                  <Text style={[st.warn, st.fill]}>{fix.message}</Text>
                  <Button title="Convert" variant="secondary" onPress={() => setLab(key, String(fix.value))} />
                </View>
              ) : out ? (
                <Text style={st.warn}>Outside the usual range ({ranges?.[key].min}–{ranges?.[key].max} {unitOf(key)}). Check before saving.</Text>
              ) : null}
            </View>
          );
        })}
        <TextField
          label="Retic % (optional)"
          unit="%"
          value={f.retic}
          onChangeText={(t) => set({ retic: t })}
          hint={!f.labs.arc ? (arc !== null ? `ARC will be saved as ${arc} ${unitOf('arc') ?? ''}` : 'With RBC, fills ARC when ARC is empty') : 'ARC entered directly; retic % not used'}
          error={err('retic')}
          {...numProps('retic')}
        />

        <Text style={st.group}>Treatment</Text>
        <TextField label="Weight" unit="kg" value={f.weight_kg} onChangeText={(t) => set({ weight_kg: t })} error={err('weight_kg')} {...numProps('weight_kg')} />
        <TextField
          label="Current HU dose" unit="mg" value={f.dose_mg} onChangeText={(t) => set({ dose_mg: t })}
          hint={mgPerKg ? `${mgPerKg} mg/kg` : 'mg/kg is shown once weight and dose are entered'}
          error={err('dose_mg')} {...numProps('dose_mg')}
        />
        <Segmented label="Adherence" options={ADHERENCE} value={f.adherence} onChange={(v) => set({ adherence: v })} error={err('adherence')} />

        <Text style={st.group}>Prediction gates</Text>
        <Segmented label="Transfused in last 3 months *" options={YES_NO_UNKNOWN} value={f.transfused_last_3_months}
          onChange={(v) => set({ transfused_last_3_months: v })} error={err('transfused_last_3_months')} />
        {pregnancyShown ? (
          <>
            <Segmented label="Pregnancy status *" options={PREGNANCY} value={f.pregnancy_status}
              onChange={(v) => set({ pregnancy_status: v })} error={err('pregnancy_status')} />
            <Checkbox label="Contraception counselled" checked={f.contraception_counselled} onChange={(v) => set({ contraception_counselled: v })} />
          </>
        ) : null}

        <Text style={st.group}>Clinical</Text>
        <View style={{ gap: 6 }}>
          <Text style={st.label}>Side effects</Text>
          <View style={ui.wrap}>
            {SIDE_EFFECTS.map((s) => (
              <Chip key={s.key} label={s.label} selected={!!f.side[s.key]} onPress={() => set({ side: { ...f.side, [s.key]: !f.side[s.key] } })} />
            ))}
          </View>
        </View>
        <TextField label="Pain episodes since last visit" value={f.pain_episodes} onChangeText={(t) => set({ pain_episodes: t })}
          error={err('pain_episodes')} {...numProps('pain_episodes')} />
        <DateField label="Next appointment (optional)" value={f.next_appointment_date} maximumDate={null} optional
          onChange={(d) => set({ next_appointment_date: d })} error={err('next_appointment_date')} />
        <TextField label="Note (optional)" value={f.note} onChangeText={(t) => set({ note: t })} multiline
          style={{ minHeight: 80 }} error={err('note')} />
        {serverErrors.detail ? <Text style={st.errorText}>{serverErrors.detail}</Text> : null}
      </Screen>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={ACCESSORY_ID}>
          <View style={st.accessory}>
            <Pressable onPress={() => focused.current && focusNext(focused.current)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Next field">
              <Text style={st.accessoryText}>Next</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}

      <ReviewSheet
        payload={review}
        previous={previous}
        previousLabel={previousLabel}
        baselineHgb={baselineHgb}
        unitOf={unitOf}
        submitting={submitting}
        requireReason={requireReason}
        confirmLabel={mode === 'create' ? 'Save visit' : 'Save changes'}
        onCancel={() => setReview(null)}
        onConfirm={confirm}
      />
    </View>
  );
}

function ReviewSheet({
  payload, previous, previousLabel, baselineHgb, unitOf, submitting, requireReason, confirmLabel, onCancel, onConfirm,
}: {
  payload: VisitPayload | null;
  previous?: CompareValues | null;
  previousLabel: string;
  baselineHgb?: number | null;
  unitOf: (k: LabKey) => string | undefined;
  submitting: boolean;
  requireReason?: boolean;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  if (!payload) return null;
  const rows: { key: keyof CompareValues; label: string; unit?: string }[] = [
    ...LAB_FIELDS.map((l) => ({ key: l.key, label: LAB_SHORT[l.key], unit: unitOf(l.key) })),
    { key: 'weight_kg', label: 'Weight', unit: 'kg' },
    { key: 'dose_mg', label: 'Dose', unit: 'mg' },
    { key: 'pain_episodes', label: 'Pain episodes' },
  ];
  const hbVsBaseline = payload.hgb != null && baselineHgb != null ? payload.hgb - baselineHgb : null;
  const side = SIDE_EFFECTS.filter((s) => payload[s.key]).map((s) => s.label);
  const yn = YES_NO_UNKNOWN.find((o) => o.value === payload.transfused_last_3_months)?.label;

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel} presentationStyle="pageSheet">
      <KeyboardAvoidingView style={st.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={ui.h1}>Review before saving</Text>
        <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 12 }}>
          {hbVsBaseline !== null ? (
            <Banner
              tone={hbVsBaseline >= 1 ? 'success' : 'info'}
              title={`Observed Hb change vs baseline: ${formatDelta(hbVsBaseline)} g/dL`}
              text={hbVsBaseline >= 1 ? 'Meets the ≥ 1.0 g/dL criterion.' : 'Below the ≥ 1.0 g/dL criterion.'}
            />
          ) : null}
          <View>
            <View style={st.reviewRow}>
              <Text style={[st.reviewLabel, st.head]}>Value</Text>
              <Text style={[st.reviewVal, st.head]}>Now</Text>
              <Text style={[st.reviewPrev, st.head]}>{previous ? previousLabel : ''}</Text>
            </View>
            {rows.map(({ key, label, unit }) => {
              const now = payload[key] ?? null;
              const before = previous?.[key] ?? null;
              const arrow = now === null || before === null ? '' : now > before ? ' ↑' : now < before ? ' ↓' : ' =';
              return (
                <View key={key} style={st.reviewRow}>
                  <Text style={st.reviewLabel}>{label}</Text>
                  <Text style={st.reviewVal}>{now === null ? '—' : `${now}${unit ? ` ${unit}` : ''}`}<Text style={st.arrow}>{arrow}</Text></Text>
                  <Text style={st.reviewPrev}>{previous ? (before === null ? '—' : String(before)) : ''}</Text>
                </View>
              );
            })}
          </View>
          <View style={ui.divider} />
          <Text style={ui.body}>Transfused in last 3 months: {yn}</Text>
          {payload.pregnancy_status ? <Text style={ui.body}>Pregnancy: {PREGNANCY.find((p) => p.value === payload.pregnancy_status)?.label}</Text> : null}
          <Text style={ui.body}>Adherence: {ADHERENCE.find((a) => a.value === payload.adherence)?.label ?? '—'}</Text>
          <Text style={ui.body}>Side effects: {side.length ? side.join(', ') : 'None'}</Text>
          {payload.note ? <Text style={ui.body}>Note: {payload.note}</Text> : null}
          <Text style={ui.muted}>Safety flags are checked by the server when you save and shown on the visit.</Text>
          {requireReason ? (
            <TextField label="Reason for edit *" value={reason} onChangeText={setReason} multiline style={{ minHeight: 60 }}
              placeholder="e.g. Corrected ANC typo from lab printout" hint="Required. Stored in the audit log." />
          ) : null}
        </ScrollView>
        <View style={st.sheetActions}>
          <Button title="Back to form" variant="secondary" onPress={onCancel} style={st.fill} disabled={submitting} />
          <Button title={confirmLabel} onPress={() => onConfirm(reason.trim())} loading={submitting}
            disabled={requireReason && !reason.trim()} style={st.fill} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1 },
  pinned: { backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  group: { fontFamily: Fonts.headingBold, fontSize: 16, color: C.text, marginTop: 8 },
  label: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: C.text },
  labBlock: { gap: 6 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warn: { fontFamily: Fonts.bodySemiBold, fontSize: 12, color: C.warn, backgroundColor: C.warnSoft, padding: 8, borderRadius: 8 },
  errorText: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: C.danger },
  accessory: { backgroundColor: '#f1f5f9', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line },
  accessoryText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: C.primaryDark },
  sheet: { flex: 1, backgroundColor: C.bg, padding: 16, paddingTop: 24 },
  sheetActions: { flexDirection: 'row', gap: 10, paddingBottom: 24 },
  reviewRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line },
  reviewLabel: { flex: 1.1, fontFamily: Fonts.body, fontSize: 14, color: C.muted },
  reviewVal: { flex: 1.4, fontFamily: Fonts.bodySemiBold, fontSize: 14, color: C.text },
  reviewPrev: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: C.muted, textAlign: 'right' },
  head: { fontFamily: Fonts.bodyBold, fontSize: 12, color: C.muted },
  arrow: { fontFamily: Fonts.bodyBold, color: C.primaryDark },
});
