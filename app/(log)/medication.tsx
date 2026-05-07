import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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

import { useLogMedication } from '@/features/medications/hooks';
import { ApiError } from '@/lib/api/api-error';
import { Fonts } from '../../constants/theme';

const BACKGROUND  = '#f8faf9';
const CARD_BG     = '#ffffff';
const MUTED       = '#64748b';
const DARK        = '#0f172a';

function CustomSwitch({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onValueChange(!value)}
      style={[
        { width: 52, height: 28, borderRadius: 14, padding: 2, justifyContent: 'center' },
        value
          ? { backgroundColor: '#059669', alignItems: 'flex-end' }
          : { backgroundColor: '#e2e8f0', alignItems: 'flex-start' },
      ]}
    >
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 }}>
        {value && <Ionicons name="checkmark" size={16} color="#2563eb" />}
      </View>
    </TouchableOpacity>
  );
}

export default function MedicationScreen() {
  const insets   = useSafeAreaInsets();
  const mutation = useLogMedication();

  const [tookDose,    setTookDose]    = useState(false);
  const [dosage,      setDosage]      = useState('500');
  const [notes,       setNotes]       = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMsg,  setSuccessMsg]  = useState('');

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleSave = () => {
    setFieldErrors({});
    setSuccessMsg('');

    const dose_mg = tookDose ? parseInt(dosage, 10) || null : null;

    mutation.mutate(
      {
        hu_taken: tookDose,
        dose_mg:  tookDose ? dose_mg : undefined,
        notes:    notes.trim() || undefined,
      },
      {
        onSuccess: (_, _vars, _ctx) => {
          // httpClient returns the raw response; we check status via the
          // onSuccess vs onError split. The spec says 200 = updated, 201 = new.
          // Both land here — distinguish via mutation.data if needed.
          setSuccessMsg('Dose logged for today');
          setTimeout(() => router.back(), 1200);
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
      }
    );
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
        <Text style={styles.pageTitle}>Medication</Text>
        <Text style={styles.pageSubtitle}>
          Track your daily Hydroxyurea intake.
        </Text>

        {/* ── Success banner ── */}
        {successMsg ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* ── Prescription Card ── */}
        <LinearGradient
          colors={['#fcfff8', '#ffffff', '#ffffff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardRow}>
            <View style={styles.iconBubble}>
              <Ionicons name="medical" size={18} color="#059669" style={{ transform: [{ rotate: '45deg' }] }} />
            </View>
            <View style={styles.cardTexts}>
              <Text style={styles.cardTitle}>Hydroxyurea (HU)</Text>
              <Text style={styles.cardSubtitle}>Active prescription</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>CURRENT DOSAGE (mg)</Text>
          <View style={[styles.inputWrapper, fieldErrors.dose_mg ? styles.inputWrapperError : null]}>
            <TextInput
              style={styles.input}
              value={dosage}
              onChangeText={setDosage}
              keyboardType="numeric"
              editable={tookDose}
              placeholder="e.g. 500"
              placeholderTextColor={MUTED}
            />
            <Text style={styles.inputUnit}>mg</Text>
          </View>
          {fieldErrors.dose_mg ? (
            <Text style={styles.fieldError}>{fieldErrors.dose_mg}</Text>
          ) : null}
        </LinearGradient>

        {/* ── Daily Log Card ── */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBubble, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#059669" />
            </View>
            <View style={styles.cardTexts}>
              <Text style={styles.cardTitle}>Took my dose today</Text>
              <Text style={styles.cardSubtitle}>{today}</Text>
            </View>
            <CustomSwitch value={tookDose} onValueChange={setTookDose} />
          </View>
          {fieldErrors.hu_taken ? (
            <Text style={[styles.fieldError, { marginTop: 8 }]}>{fieldErrors.hu_taken}</Text>
          ) : null}
        </View>

        {/* ── Notes Card ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>NOTES (OPTIONAL)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Taken with breakfast"
            placeholderTextColor={MUTED}
            multiline
            maxLength={500}
          />
        </View>
      </ScrollView>

      {/* ── Fixed Bottom Button ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={mutation.isPending}
          style={[styles.primaryBtn, mutation.isPending && styles.primaryBtnDisabled]}
          onPress={handleSave}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryBtnText}>Save</Text>
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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTexts: {
    flex: 1,
  },
  cardTitle: {
    color: DARK,
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    marginBottom: 2,
  },
  cardSubtitle: {
    color: MUTED,
    fontFamily: Fonts.body,
    fontSize: 13,
  },

  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 20,
  },

  fieldLabel: {
    color: DARK,
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputWrapperError: {
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    color: DARK,
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    paddingVertical: 16,
  },
  inputUnit: {
    color: MUTED,
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    marginLeft: 8,
  },
  notesInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: DARK,
    fontFamily: Fonts.body,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
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
    backgroundColor: '#059669',
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
