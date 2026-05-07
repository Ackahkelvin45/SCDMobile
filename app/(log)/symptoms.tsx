import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLogSymptoms } from '@/features/symptoms/hooks';
import { ApiError } from '@/lib/api/api-error';
import type { LogSymptomsPayload, PainLocation } from '@/features/symptoms/api/symptoms.types';
import { Fonts, PRIMARY_DARK } from '../../constants/theme';

const BACKGROUND  = '#eef2ef';
const CARD_BG     = '#ffffff';
const MUTED       = '#64748b';
const DARK        = '#0f172a';

// ─── Data ────────────────────────────────────────────────────────────────────

const PAIN_LOCATIONS: { label: string; value: PainLocation }[] = [
  { label: 'Joints (Knees, Elbows)', value: 'joints' },
  { label: 'Back',                   value: 'back'   },
  { label: 'Chest',                  value: 'chest'  },
  { label: 'Head',                   value: 'head'   },
  { label: 'Abdomen',                value: 'abdomen'},
  { label: 'Limbs',                  value: 'other'  },
];

const STRESS_LEVELS: { label: string; value: number }[] = [
  { label: 'Low',       value: 2  },
  { label: 'Moderate',  value: 5  },
  { label: 'High',      value: 7  },
  { label: 'Very High', value: 10 },
];

const HYDRATION_LEVELS: { label: string; value: number }[] = [
  { label: 'Low (<1L)',        value: 2  },
  { label: 'Moderate (1-2L)', value: 4  },
  { label: 'Good (2-3L)',     value: 7  },
  { label: 'Excellent (3L+)', value: 10 },
];

type SymptomToggle = {
  label: string;
  field: keyof Pick<LogSymptomsPayload, 'fever' | 'fatigue' | 'dizziness' | 'jaundice' | 'swelling' | 'shortness_of_breath'>;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
};

const SYMPTOMS_LIST: SymptomToggle[] = [
  { label: 'Fever',               field: 'fever',               icon: 'thermometer',  iconColor: '#ef4444', iconBg: '#fee2e2' },
  { label: 'Fatigue',             field: 'fatigue',             icon: 'battery-dead', iconColor: '#94a3b8', iconBg: '#f1f5f9' },
  { label: 'Dizziness',           field: 'dizziness',           icon: 'sync-circle',  iconColor: '#3b82f6', iconBg: '#dbeafe' },
  { label: 'Jaundice',            field: 'jaundice',            icon: 'eye-outline',  iconColor: '#f59e0b', iconBg: '#fef3c7' },
  { label: 'Joint Pain/Swelling', field: 'swelling',            icon: 'body',         iconColor: '#8b5cf6', iconBg: '#ede9fe' },
  { label: 'Shortness of Breath', field: 'shortness_of_breath', icon: 'medical',      iconColor: '#10b981', iconBg: '#d1fae5' },
];

// ─── Gradient Slider ──────────────────────────────────────────────────────────

function GradientSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);

  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, v));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (trackWidth > 0) {
          const ratio = clamp(evt.nativeEvent.locationX / trackWidth, 0, 1);
          onChange(Math.round(ratio * 10));
        }
      },
      onPanResponderMove: (evt) => {
        if (trackWidth > 0) {
          const ratio = clamp(evt.nativeEvent.locationX / trackWidth, 0, 1);
          onChange(Math.round(ratio * 10));
        }
      },
    })
  ).current;

  const thumbLeft = trackWidth > 0 ? (value / 10) * trackWidth - 14 : 0;

  return (
    <View>
      <View
        style={styles.sliderHitArea}
        onLayout={(e: LayoutChangeEvent) =>
          setTrackWidth(e.nativeEvent.layout.width)
        }
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={['#22c55e', '#86efac', '#facc15', '#f87171', '#dc2626']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sliderTrack}
        />
        <View style={[styles.sliderThumb, { left: thumbLeft }]} />
      </View>

      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>0 - NONE</Text>
        <Text style={styles.sliderLabel}>10 - SEVERE</Text>
      </View>
    </View>
  );
}

// ─── Inline Picker ────────────────────────────────────────────────────────────

function DropdownField<T extends string | number>({
  label,
  displayValue,
  options,
  onSelect,
  trailingIcon,
}: {
  label: string;
  displayValue: string;
  options: { label: string; value: T }[];
  onSelect: (v: T) => void;
  trailingIcon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.dropdown}
        onPress={() => setOpen(!open)}
      >
        <Text style={styles.dropdownText}>{displayValue}</Text>
        {trailingIcon ?? (
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
        )}
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownMenu}>
          {options.map((opt) => (
            <TouchableOpacity
              key={String(opt.value)}
              style={[styles.dropdownItem, opt.label === displayValue && styles.dropdownItemActive]}
              onPress={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  opt.label === displayValue && styles.dropdownItemTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SymptomsScreen() {
  const insets = useSafeAreaInsets();
  const mutation = useLogSymptoms();

  const [painLevel,    setPainLevel]    = useState(6);
  const [painLocation, setPainLocation] = useState<PainLocation>('joints');
  const [stressLevel,  setStressLevel]  = useState(5);
  const [hydration,    setHydration]    = useState(4);
  const [toggles, setToggles] = useState<Record<string, boolean>>({ fever: true });
  const [fieldErrors, setFieldErrors]   = useState<Record<string, string>>({});
  const [successMsg,  setSuccessMsg]    = useState('');

  const toggleSymptom = (field: string) =>
    setToggles((prev) => ({ ...prev, [field]: !prev[field] }));

  const painLocationLabel =
    PAIN_LOCATIONS.find((p) => p.value === painLocation)?.label ?? '';
  const stressLabel =
    STRESS_LEVELS.find((s) => s.value === stressLevel)?.label ?? '';
  const hydrationLabel =
    HYDRATION_LEVELS.find((h) => h.value === hydration)?.label ?? '';

  const handleSave = () => {
    setFieldErrors({});
    setSuccessMsg('');

    const payload: LogSymptomsPayload = {
      pain_level:         painLevel,
      pain_location:      painLocation,
      stress_level:       stressLevel,
      hydration_level:    hydration,
      fatigue:            !!toggles.fatigue,
      shortness_of_breath: !!toggles.shortness_of_breath,
      dizziness:          !!toggles.dizziness,
      fever:              !!toggles.fever,
      jaundice:           !!toggles.jaundice,
      swelling:           !!toggles.swelling,
    };

    mutation.mutate(payload, {
      onSuccess: () => {
        setSuccessMsg('Symptoms logged successfully!');
        setTimeout(() => {
          router.back();
        }, 1200);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 400 && err.data) {
          const raw = err.data as Record<string, string[]>;
          const mapped: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(raw)) {
            if (Array.isArray(msgs) && msgs.length > 0) mapped[key] = msgs[0];
          }
          setFieldErrors(mapped);
        }
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Page heading */}
        <Text style={styles.pageTitle}>Log Symptoms</Text>
        <Text style={styles.pageSubtitle}>
          Record your vitals to help the AI detect early trends.
        </Text>

        {/* ── Success banner ── */}
        {successMsg ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* ── Pain Level ── */}
        <View style={styles.card}>
          <View style={styles.painHeader}>
            <Text style={styles.cardTitle}>Pain Level</Text>
            <Text style={styles.painValue}>{painLevel}</Text>
          </View>
          <GradientSlider value={painLevel} onChange={setPainLevel} />
          {fieldErrors.pain_level ? (
            <Text style={styles.fieldError}>{fieldErrors.pain_level}</Text>
          ) : null}
        </View>

        {/* ── Context ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Context</Text>

          <DropdownField<PainLocation>
            label="PAIN LOCATION"
            displayValue={painLocationLabel}
            options={PAIN_LOCATIONS}
            onSelect={setPainLocation}
          />
          {fieldErrors.pain_location ? (
            <Text style={styles.fieldError}>{fieldErrors.pain_location}</Text>
          ) : null}

          <DropdownField<number>
            label="STRESS LEVEL"
            displayValue={stressLabel}
            options={STRESS_LEVELS}
            onSelect={setStressLevel}
          />
          {fieldErrors.stress_level ? (
            <Text style={styles.fieldError}>{fieldErrors.stress_level}</Text>
          ) : null}

          <DropdownField<number>
            label="HYDRATION LEVEL"
            displayValue={hydrationLabel}
            options={HYDRATION_LEVELS}
            onSelect={setHydration}
            trailingIcon={
              <Ionicons name="water" size={18} color={PRIMARY_DARK} />
            }
          />
          {fieldErrors.hydration_level ? (
            <Text style={styles.fieldError}>{fieldErrors.hydration_level}</Text>
          ) : null}
        </View>

        {/* ── Additional Symptoms ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Additional Symptoms</Text>

          {SYMPTOMS_LIST.map((sym, index) => (
            <View key={sym.field}>
              <View style={styles.symptomRow}>
                <View
                  style={[
                    styles.symptomIconBg,
                    { backgroundColor: sym.iconBg },
                  ]}
                >
                  <Ionicons
                    name={sym.icon}
                    size={18}
                    color={sym.iconColor}
                  />
                </View>

                <Text style={styles.symptomName}>{sym.label}</Text>

                <Switch
                  value={!!toggles[sym.field]}
                  onValueChange={() => toggleSymptom(sym.field)}
                  trackColor={{ false: '#e2e8f0', true: PRIMARY_DARK }}
                  thumbColor="#ffffff"
                  ios_backgroundColor="#e2e8f0"
                />
              </View>

              {index < SYMPTOMS_LIST.length - 1 && (
                <View style={styles.divider} />
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Fixed Save Button ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={mutation.isPending}
          style={[styles.primaryBtn, mutation.isPending && styles.primaryBtnDisabled]}
          onPress={handleSave}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryBtnText}>Save Symptoms</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },

  // Headings
  pageTitle: {
    color: DARK,
    fontFamily: Fonts.headingBold,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  pageSubtitle: {
    color: MUTED,
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },

  // Success banner
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 14,
  },
  successText: {
    color: '#166534',
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },

  // Field error
  fieldError: {
    color: '#ef4444',
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },

  // Card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    color: DARK,
    fontFamily: Fonts.headingBold,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },

  // Pain header
  painHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  painValue: {
    color: PRIMARY_DARK,
    fontFamily: Fonts.headingBold,
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 48,
  },

  // Slider
  sliderHitArea: {
    height: 36,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  sliderTrack: {
    height: 10,
    borderRadius: 5,
    width: '100%',
  },
  sliderThumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 2.5,
    borderColor: PRIMARY_DARK,
    top: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sliderLabel: {
    color: MUTED,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.4,
  },

  // Context dropdowns
  fieldWrapper: {
    marginBottom: 4,
  },
  fieldLabel: {
    color: MUTED,
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 14,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownText: {
    color: DARK,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  dropdownMenu: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemActive: {
    backgroundColor: '#f0fdf4',
  },
  dropdownItemText: {
    color: MUTED,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  dropdownItemTextActive: {
    color: PRIMARY_DARK,
    fontFamily: Fonts.bodyBold,
  },

  // Symptom toggles
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  symptomIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomName: {
    flex: 1,
    color: DARK,
    fontFamily: Fonts.body,
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 56,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BACKGROUND,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  primaryBtn: {
    backgroundColor: PRIMARY_DARK,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
