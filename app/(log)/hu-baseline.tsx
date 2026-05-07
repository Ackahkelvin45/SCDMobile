import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setHUBaseline } from '@/features/ml/api/ml.service';
import { ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/react-query/query-keys';
import { Fonts } from '../../constants/theme';

const BACKGROUND = '#f8faf9';
const CARD_BG    = '#ffffff';
const MUTED      = '#64748b';
const DARK       = '#0f172a';
const GREEN      = '#22C55E';
const GREEN_DARK = '#16A34A';

export default function HUBaselineScreen() {
  const insets      = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [hgb, setHgb]           = useState('');
  const [startDate, setStartDate] = useState('');
  const [saved, setSaved]        = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      setHUBaseline({
        baseline_hgb: parseFloat(hgb),
        hu_start_date: startDate,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.ml.baseline });
      setSaved(true);
      setTimeout(() => router.back(), 1000);
    },
  });

  function validate(): boolean {
    const hgbVal = parseFloat(hgb);
    if (!hgb || isNaN(hgbVal) || hgbVal <= 0 || hgbVal > 25) {
      setFieldError('Enter a valid haemoglobin value between 1 and 25 g/dL.');
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setFieldError('Enter the date as YYYY-MM-DD (e.g. 2024-01-15).');
      return false;
    }
    setFieldError(null);
    return true;
  }

  function handleSave() {
    if (!validate()) return;
    mutation.mutate();
  }

  const errorMessage: string | null = (() => {
    if (fieldError) return fieldError;
    if (!mutation.isError) return null;
    if (mutation.error instanceof ApiError) return mutation.error.message;
    return 'Something went wrong. Please try again.';
  })();

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text style={styles.title}>HU Baseline Setup</Text>
        <Text style={styles.subtitle}>
          This is recorded once when treatment begins. It's used to measure your response to
          Hydroxyurea.
        </Text>

        {/* Form card */}
        <View style={styles.card}>
          {/* Baseline Hb field */}
          <Text style={styles.fieldLabel}>Baseline Haemoglobin</Text>
          <Text style={styles.fieldHint}>What was your Hb when you started HU?</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 8.5"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={hgb}
              onChangeText={(t) => { setHgb(t); setFieldError(null); }}
            />
            <Text style={styles.unit}>g/dL</Text>
          </View>

          <View style={styles.divider} />

          {/* HU Start Date field */}
          <Text style={styles.fieldLabel}>HU Start Date</Text>
          <Text style={styles.fieldHint}>When did you start Hydroxyurea?</Text>
          <View style={styles.inputRow}>
            <Ionicons name="calendar-outline" size={18} color={MUTED} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              keyboardType="numbers-and-punctuation"
              value={startDate}
              onChangeText={(t) => { setStartDate(t); setFieldError(null); }}
            />
          </View>

          {/* Error */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, (mutation.isPending || saved) && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={mutation.isPending || saved}
          >
            {saved ? (
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
            ) : mutation.isPending ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.saveBtnText}>Saving…</Text>
              </>
            ) : (
              <Text style={styles.saveBtnText}>Save Baseline</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Clinical note */}
        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={18} color="#0284C7" />
          <Text style={styles.noteText}>
            The ML model uses this value to determine whether your haemoglobin has improved by at
            least 1.0 g/dL since starting Hydroxyurea.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: BACKGROUND },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },

  title: {
    color: DARK,
    fontFamily: Fonts.headingBold,
    fontSize: 24,
    marginBottom: 6,
  },
  subtitle: {
    color: MUTED,
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },

  fieldLabel: {
    color: DARK,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  fieldHint: {
    color: MUTED,
    fontFamily: Fonts.body,
    fontSize: 12,
    marginBottom: 4,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    color: DARK,
    fontFamily: Fonts.body,
    fontSize: 16,
    paddingVertical: 13,
  },
  unit: {
    color: '#71717A',
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    marginLeft: 8,
  },

  divider: {
    height: 1,
    backgroundColor: '#F4F4F5',
    marginVertical: 4,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },

  saveBtn: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 8,
    width: '100%',
  },
  saveBtnDisabled: { backgroundColor: GREEN_DARK, opacity: 0.7 },
  saveBtnText: {
    color: '#fff',
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
  },

  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: 14,
  },
  noteText: {
    flex: 1,
    color: '#0369A1',
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
});
