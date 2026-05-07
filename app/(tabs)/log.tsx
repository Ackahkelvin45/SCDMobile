import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, PRIMARY } from '../../constants/theme';
import { useSaveVisit } from '@/features/visits/hooks';
import { useLatestVisit } from '@/features/visits/hooks';
import type { SaveVisitPayload } from '@/features/visits/api';

// ─── palette ─────────────────────────────────────────────────────────────────
const BG     = '#f0f9f4';
const CARD   = '#ffffff';
const MUTED  = '#64748b';
const DARK   = '#0f172a';
const BORDER = '#e2e8f0';
const TEAL   = '#007a6e';

// ─── lab fields ───────────────────────────────────────────────────────────────
type LabField = {
  key: keyof Pick<SaveVisitPayload, 'hgb' | 'wbc' | 'platelet_count' | 'hct' | 'rbc' | 'mcv' | 'anc' | 'arc'>;
  label: string;
  abbr: string;
  unit: string;
  placeholder: string;
  normal: string;
};

const LAB_FIELDS: LabField[] = [
  { key: 'hgb',           label: 'Haemoglobin',             abbr: 'HGB', unit: 'g/dL',    placeholder: 'e.g. 10.2', normal: '11.5 – 17.5'  },
  { key: 'wbc',           label: 'White Blood Cells',       abbr: 'WBC', unit: '×10³/µL', placeholder: 'e.g. 8.4',  normal: '4.5 – 11.0'   },
  { key: 'platelet_count',label: 'Platelets',               abbr: 'PLT', unit: '×10³/µL', placeholder: 'e.g. 320',  normal: '150 – 400'    },
  { key: 'hct',           label: 'Haematocrit',             abbr: 'HCT', unit: '%',        placeholder: 'e.g. 31.5', normal: '36 – 50'      },
  { key: 'rbc',           label: 'Red Blood Cells',         abbr: 'RBC', unit: '×10¹²/L', placeholder: 'e.g. 3.6',  normal: '3.8 – 5.8'    },
  { key: 'mcv',           label: 'Mean Corpuscular Volume', abbr: 'MCV', unit: 'fL',       placeholder: 'e.g. 88',   normal: '80 – 100'     },
  { key: 'anc',           label: 'Neutrophils (ANC)',       abbr: 'ANC', unit: '/µL',      placeholder: 'e.g. 3200', normal: '1,800 – 7,700'},
  { key: 'arc',           label: 'Reticulocyte Count (ARC)',abbr: 'ARC', unit: '×10⁹/L',  placeholder: 'e.g. 48',   normal: '25 – 85'      },
];

// ─── side effects ─────────────────────────────────────────────────────────────
const SIDE_EFFECTS = [
  { key: 'toxicity_nausea',      label: 'Nausea',               icon: 'medical-outline'      as const, color: '#a855f7' },
  { key: 'toxicity_vomiting',    label: 'Vomiting',             icon: 'water-outline'        as const, color: '#ef4444' },
  { key: 'toxicity_rash',        label: 'Rash',                 icon: 'bandage-outline'      as const, color: '#f97316' },
  { key: 'toxicity_fatigue',     label: 'Fatigue',              icon: 'battery-dead-outline' as const, color: '#94a3b8' },
  { key: 'toxicity_headache',    label: 'Headache',             icon: 'flash-outline'        as const, color: '#3b82f6' },
  { key: 'toxicity_neutropenia', label: 'Low neutrophil count', icon: 'warning-outline'      as const, color: '#eab308' },
];

// 0=date  1-8=labs  9=toxicity  10=pain  11=summary
const TOTAL = 12;

function formatDate(d: Date) {
  return [
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    d.getFullYear(),
  ].join('/');
}

function stepMeta(step: number) {
  const n = step + 1;
  if (step === 0)             return { num: `${n} / ${TOTAL}`, name: 'Visit Date'   };
  if (step >= 1 && step <= 8) return { num: `${n} / ${TOTAL}`, name: 'Lab Results'  };
  if (step === 9)             return { num: `${n} / ${TOTAL}`, name: 'Side Effects' };
  if (step === 10)            return { num: `${n} / ${TOTAL}`, name: 'Pain Events'  };
  return                      { num: `${n} / ${TOTAL}`, name: 'Summary'      };
}

type LabMap = Record<string, string>;
type FxMap  = Record<string, boolean>;

// ─── component ────────────────────────────────────────────────────────────────
export default function LogScreen() {
  const insets    = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;

  const { data: latestVisit } = useLatestVisit();
  const saveVisitMutation     = useSaveVisit();

  const [step,           setStep]           = useState(0);
  const [visitDate,      setVisitDate]      = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [labValues,      setLabValues]      = useState<LabMap>(() =>
    Object.fromEntries(LAB_FIELDS.map((f) => [f.key, ''])));
  const [sideEffects,    setSideEffects]    = useState<FxMap>(() =>
    Object.fromEntries(SIDE_EFFECTS.map((e) => [e.key, false])));
  const [painEpisodes,   setPainEpisodes]   = useState('');
  const [saved,          setSaved]          = useState(false);

  function animate(fwd: boolean) {
    slideAnim.setValue(fwd ? 50 : -50);
    Animated.spring(slideAnim, {
      toValue: 0, damping: 18, stiffness: 260, useNativeDriver: true,
    }).start();
  }

  function next() { if (step < TOTAL - 1) { animate(true);  setStep((s) => s + 1); } }
  function back() { if (step > 0)          { animate(false); setStep((s) => s - 1); } }

  function resetForm() {
    setStep(0); setSaved(false);
    setVisitDate(new Date());
    setLabValues(Object.fromEntries(LAB_FIELDS.map((f) => [f.key, ''])));
    setSideEffects(Object.fromEntries(SIDE_EFFECTS.map((e) => [e.key, false])));
    setPainEpisodes('');
    saveVisitMutation.reset();
  }

  function handleSave() {
    const isoDate = visitDate.toISOString().split('T')[0];

    const payload: SaveVisitPayload = {
      visit_date:           isoDate,
      hgb:                  parseFloat(labValues.hgb)            || null,
      wbc:                  parseFloat(labValues.wbc)            || null,
      platelet_count:       parseFloat(labValues.platelet_count) || null,
      hct:                  parseFloat(labValues.hct)            || null,
      rbc:                  parseFloat(labValues.rbc)            || null,
      mcv:                  parseFloat(labValues.mcv)            || null,
      anc:                  parseFloat(labValues.anc)            || null,
      arc:                  parseFloat(labValues.arc)            || null,
      toxicity_nausea:      sideEffects.toxicity_nausea,
      toxicity_vomiting:    sideEffects.toxicity_vomiting,
      toxicity_rash:        sideEffects.toxicity_rash,
      toxicity_fatigue:     sideEffects.toxicity_fatigue,
      toxicity_headache:    sideEffects.toxicity_headache,
      toxicity_neutropenia: sideEffects.toxicity_neutropenia,
      pain_episodes:        parseInt(painEpisodes, 10) || 0,
      lab_photo_url:        null,
    };

    saveVisitMutation.mutate(payload, {
      onSuccess: () => setSaved(true),
      onError: (err) => {
        const message = err instanceof Error ? err.message : 'Failed to save. Please try again.';
        Alert.alert('Save Failed', message);
      },
    });
  }

  // ─── step renderers ──────────────────────────────────────────────────────────

  function renderDate() {
    return (
      <View style={s.card}>
        <View style={[s.bubble, { backgroundColor: '#dcfce7' }]}>
          <Ionicons name="calendar" size={26} color={PRIMARY} />
        </View>
        <Text style={s.title}>Date of Visit</Text>
        <Text style={s.sub}>When did you visit the clinic?</Text>

        <TouchableOpacity style={s.datePickerBtn} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={MUTED} />
          <Text style={s.datePickerText}>{formatDate(visitDate)}</Text>
          <Ionicons name="chevron-down" size={16} color={MUTED} />
        </TouchableOpacity>

        {Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide" visible={showDatePicker}>
            <View style={s.modalOverlay}>
              <View style={s.modalSheet}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Select Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={s.modalDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={visitDate}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={(_, date) => { if (date) setVisitDate(date); }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          showDatePicker && (
            <DateTimePicker
              value={visitDate}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setVisitDate(date);
              }}
            />
          )
        )}

        <TouchableOpacity style={s.ghost} onPress={() => setVisitDate(new Date())}>
          <Ionicons name="today-outline" size={13} color={TEAL} />
          <Text style={s.ghostText}>Use today&apos;s date</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderLab(field: LabField) {
    const lastRaw = latestVisit?.[field.key];
    const last    = lastRaw != null ? String(lastRaw) : null;

    return (
      <View style={s.card}>
        <View style={[s.bubble, { backgroundColor: '#e0f2fe' }]}>
          <Text style={s.abbrText}>{field.abbr}</Text>
        </View>
        <Text style={s.title}>{field.label}</Text>
        <Text style={s.sub}>Normal range: {field.normal} {field.unit}</Text>

        <View style={s.inputRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={labValues[field.key]}
            onChangeText={(v) => setLabValues((p) => ({ ...p, [field.key]: v }))}
            placeholder={field.placeholder}
            placeholderTextColor={MUTED}
            keyboardType="decimal-pad"
            autoFocus
          />
          <View style={s.unitBadge}>
            <Text style={s.unitText}>{field.unit}</Text>
          </View>
        </View>

        {last ? (
          <View style={s.lastRow}>
            <Ionicons name="time-outline" size={13} color={MUTED} />
            <Text style={s.lastText}>Last visit: {last} {field.unit}</Text>
          </View>
        ) : null}

        {field.key === 'arc' && (
          <View style={s.arcNote}>
            <Ionicons name="information-circle-outline" size={14} color="#3b82f6" />
            <Text style={s.arcNoteText}>
              Reticulocyte Count (ARC) is the earliest blood marker to rise when Hydroxyurea is working. It reflects the bone marrow&apos;s response.
            </Text>
          </View>
        )}

        <TouchableOpacity style={s.ghost} onPress={next}>
          <Text style={s.ghostText}>Skip this field</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderSideEffects() {
    return (
      <View style={s.card}>
        <View style={[s.bubble, { backgroundColor: '#fef9c3' }]}>
          <Ionicons name="warning" size={26} color="#ca8a04" />
        </View>
        <Text style={s.title}>Toxicity & Side Effects</Text>
        <Text style={s.sub}>Did your doctor mention any of these?</Text>

        <View style={{ marginTop: 4 }}>
          {SIDE_EFFECTS.map((e) => {
            const checked = sideEffects[e.key];
            return (
              <TouchableOpacity
                key={e.key}
                style={[s.checkRow, checked && s.checkRowOn]}
                onPress={() => setSideEffects((p) => ({ ...p, [e.key]: !p[e.key] }))}
                activeOpacity={0.7}
              >
                <View style={[s.fxIcon, { backgroundColor: checked ? e.color + '22' : '#f1f5f9' }]}>
                  <Ionicons name={e.icon} size={18} color={checked ? e.color : MUTED} />
                </View>
                <Text style={[s.checkLabel, checked && { color: DARK, fontFamily: Fonts.bodySemiBold }]}>
                  {e.label}
                </Text>
                <View style={[s.checkbox, checked && s.checkboxOn]}>
                  {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  function renderPain() {
    const opts = ['0', '1', '2', '3', '4', '5', '6+'];
    return (
      <View style={s.card}>
        <View style={[s.bubble, { backgroundColor: '#fee2e2' }]}>
          <Ionicons name="flash" size={26} color="#ef4444" />
        </View>
        <Text style={s.title}>Pain Episodes</Text>
        <Text style={s.sub}>How many pain crises since your last visit?</Text>

        <View style={s.painGrid}>
          {opts.map((o) => {
            const on = painEpisodes === o;
            return (
              <TouchableOpacity
                key={o}
                style={[s.painChip, on && s.painChipOn]}
                onPress={() => setPainEpisodes(o)}
              >
                <Text style={[s.painChipText, on && s.painChipTextOn]}>{o}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.painHint}>
          Includes episodes logged from the Dashboard quick-logger
        </Text>
      </View>
    );
  }

  function renderSummary() {
    const checkedFx  = SIDE_EFFECTS.filter((e) => sideEffects[e.key]);
    const enteredLab = LAB_FIELDS.filter((f) => labValues[f.key].trim());

    return (
      <>
        <View style={s.card}>
          <View style={[s.bubble, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="checkmark-done" size={26} color={PRIMARY} />
          </View>
          <Text style={s.title}>Review & Save</Text>
          <Text style={s.sub}>Everything look right?</Text>
        </View>

        <View style={s.summSection}>
          <Text style={s.summTitle}>VISIT DATE</Text>
          <Text style={s.summVal}>{formatDate(visitDate)}</Text>
        </View>

        <View style={s.summSection}>
          <Text style={s.summTitle}>LAB RESULTS</Text>
          {enteredLab.length > 0
            ? enteredLab.map((f) => (
                <View key={f.key} style={s.summRow}>
                  <Text style={s.summKey}>
                    {f.abbr}{'  '}
                    <Text style={s.summSub}>{f.label}</Text>
                  </Text>
                  <Text style={s.summRowVal}>{labValues[f.key]} {f.unit}</Text>
                </View>
              ))
            : <Text style={s.summEmpty}>No values entered</Text>}
        </View>

        <View style={s.summSection}>
          <Text style={s.summTitle}>SIDE EFFECTS REPORTED</Text>
          {checkedFx.length > 0
            ? checkedFx.map((e) => (
                <Text key={e.key} style={s.summBullet}>• {e.label}</Text>
              ))
            : <Text style={s.summEmpty}>None reported</Text>}
        </View>

        <View style={s.summSection}>
          <Text style={s.summTitle}>PAIN EPISODES</Text>
          <Text style={s.summVal}>
            {painEpisodes
              ? `${painEpisodes} episode${painEpisodes === '1' ? '' : 's'}`
              : 'Not recorded'}
          </Text>
        </View>

        {saved && (
          <View style={s.savedBanner}>
            <Ionicons name="checkmark-circle" size={22} color="#15803d" />
            <Text style={s.savedText}>Saved successfully!</Text>
          </View>
        )}
      </>
    );
  }

  function renderStep() {
    if (step === 0)             return renderDate();
    if (step >= 1 && step <= 8) return renderLab(LAB_FIELDS[step - 1]);
    if (step === 9)             return renderSideEffects();
    if (step === 10)            return renderPain();
    return renderSummary();
  }

  const { num, name } = stepMeta(step);
  const progress = step / (TOTAL - 1);
  const isLast   = step === TOTAL - 1;
  const isSaving = saveVisitMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── progress bar ── */}
      <View style={s.progressWrap}>
        <View style={s.progressMeta}>
          <Text style={s.progressNum}>{num}</Text>
          <Text style={s.progressName}>{name}</Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* ── step content ── */}
      <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>
      </Animated.View>

      {/* ── nav buttons ── */}
      <View style={[s.navBar, { paddingBottom: insets.bottom + 12 }]}>
        {step > 0 && !saved ? (
          <TouchableOpacity style={s.backBtn} onPress={back}>
            <Ionicons name="arrow-back" size={18} color={DARK} />
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {isLast ? (
          saved ? (
            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: TEAL }]}
              onPress={resetForm}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={s.primaryBtnText}>New Entry</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.saveBtn, isSaving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="cloud-upload-outline" size={18} color="#fff" />}
              <Text style={s.primaryBtnText}>{isSaving ? 'Saving…' : 'Save & Sync'}</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity style={s.primaryBtn} onPress={next}>
            <Text style={s.primaryBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // progress
  progressWrap:  { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12 },
  progressMeta:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressNum:   { color: MUTED, fontFamily: Fonts.bodyMedium, fontSize: 12 },
  progressName:  { color: DARK,  fontFamily: Fonts.bodySemiBold, fontSize: 12 },
  progressTrack: { backgroundColor: '#e2e8f0', borderRadius: 4, height: 5, overflow: 'hidden' },
  progressFill:  { backgroundColor: PRIMARY, borderRadius: 4, height: '100%' },

  // scroll + card
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  card: {
    backgroundColor: CARD, borderRadius: 24, marginBottom: 16, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },

  // step header
  bubble: {
    alignItems: 'center', borderRadius: 20, height: 52,
    justifyContent: 'center', marginBottom: 16, width: 52,
  },
  abbrText: { color: '#0369a1', fontFamily: Fonts.bodyBold, fontSize: 14 },
  title:    { color: DARK, fontFamily: Fonts.headingBold, fontSize: 22, letterSpacing: -0.4, marginBottom: 6 },
  sub:      { color: MUTED, fontFamily: Fonts.body, fontSize: 14, lineHeight: 20, marginBottom: 20 },

  // input
  inputRow: {
    alignItems: 'center', backgroundColor: '#f8fafc', borderColor: BORDER,
    borderRadius: 14, borderWidth: 1.5, flexDirection: 'row',
    marginBottom: 14, paddingHorizontal: 16, paddingVertical: 2,
  },
  input: {
    color: DARK, flex: 1, fontFamily: Fonts.bodyMedium,
    fontSize: 18, paddingVertical: 12,
  },
  unitBadge: {
    backgroundColor: '#e2e8f0', borderRadius: 8,
    marginLeft: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  unitText: { color: MUTED, fontFamily: Fonts.bodySemiBold, fontSize: 12 },

  // last value
  lastRow:  { alignItems: 'center', flexDirection: 'row', gap: 5, marginBottom: 10 },
  lastText: { color: MUTED, fontFamily: Fonts.body, fontSize: 13 },

  // ARC clinical note
  arcNote:     { alignItems: 'flex-start', backgroundColor: '#eff6ff', borderRadius: 10, flexDirection: 'row', gap: 8, marginBottom: 10, padding: 12 },
  arcNoteText: { color: '#1d4ed8', flex: 1, fontFamily: Fonts.body, fontSize: 12, lineHeight: 18 },

  // ghost chip
  ghost:     { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 6, marginTop: 6, padding: 6 },
  ghostText: { color: TEAL, fontFamily: Fonts.bodySemiBold, fontSize: 14 },

  // date picker
  datePickerBtn: {
    alignItems: 'center', backgroundColor: '#f8fafc', borderColor: BORDER,
    borderRadius: 14, borderWidth: 1.5, flexDirection: 'row',
    gap: 10, marginBottom: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  datePickerText: { color: DARK, flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 18 },
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: { backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  modalHeader: {
    alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomColor: BORDER, borderBottomWidth: 1,
  },
  modalTitle: { color: DARK, fontFamily: Fonts.bodyBold, fontSize: 16 },
  modalDone:  { color: TEAL, fontFamily: Fonts.bodySemiBold, fontSize: 16 },

  // side effects
  checkRow: {
    alignItems: 'center', backgroundColor: '#f8fafc', borderColor: BORDER,
    borderRadius: 14, borderWidth: 1, flexDirection: 'row',
    marginBottom: 10, padding: 14,
  },
  checkRowOn:  { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  fxIcon:      { alignItems: 'center', borderRadius: 10, height: 36, justifyContent: 'center', marginRight: 12, width: 36 },
  checkLabel:  { color: MUTED, flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 14 },
  checkbox:    {
    alignItems: 'center', borderColor: BORDER, borderRadius: 6,
    borderWidth: 2, height: 22, justifyContent: 'center', width: 22,
  },
  checkboxOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },

  // pain grid
  painGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  painChip:        { alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 14, height: 54, justifyContent: 'center', width: 54 },
  painChipOn:      { backgroundColor: PRIMARY },
  painChipText:    { color: DARK, fontFamily: Fonts.bodyBold, fontSize: 18 },
  painChipTextOn:  { color: '#fff', fontFamily: Fonts.bodyBold, fontSize: 18 },
  painHint:        { color: MUTED, fontFamily: Fonts.body, fontSize: 12, lineHeight: 18 },

  // summary
  summSection: {
    backgroundColor: CARD, borderRadius: 18, marginBottom: 12, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  summTitle:  { color: MUTED, fontFamily: Fonts.bodySemiBold, fontSize: 10, letterSpacing: 1, marginBottom: 10 },
  summVal:    { color: DARK, fontFamily: Fonts.bodyBold, fontSize: 16 },
  summRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summKey:    { color: DARK, fontFamily: Fonts.bodyBold, fontSize: 14 },
  summSub:    { color: MUTED, fontFamily: Fonts.body, fontSize: 13 },
  summRowVal: { color: PRIMARY, fontFamily: Fonts.bodySemiBold, fontSize: 14 },
  summEmpty:  { color: MUTED, fontFamily: Fonts.body, fontSize: 14 },
  summBullet: { color: DARK, fontFamily: Fonts.body, fontSize: 14, lineHeight: 22 },

  // saved
  savedBanner: {
    alignItems: 'center', backgroundColor: '#dcfce7', borderRadius: 14,
    flexDirection: 'row', gap: 10, marginTop: 12, padding: 16,
  },
  savedText: { color: '#15803d', fontFamily: Fonts.bodySemiBold, fontSize: 15 },

  // nav
  navBar: {
    alignItems: 'center', backgroundColor: CARD, borderTopColor: BORDER,
    borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14,
  },
  backBtn:       { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 6 },
  backText:      { color: DARK, fontFamily: Fonts.bodySemiBold, fontSize: 15 },
  primaryBtn: {
    alignItems: 'center', backgroundColor: PRIMARY, borderRadius: 30,
    flexDirection: 'row', gap: 8, paddingHorizontal: 28, paddingVertical: 14,
  },
  saveBtn: {
    alignItems: 'center', backgroundColor: TEAL, borderRadius: 30,
    flexDirection: 'row', gap: 8, paddingHorizontal: 28, paddingVertical: 14,
  },
  primaryBtnText: { color: '#fff', fontFamily: Fonts.bodySemiBold, fontSize: 15 },
});
