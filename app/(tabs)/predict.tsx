import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';

import { predictHUResponse } from '@/features/ml/api/ml.service';
import type { PredictResponse } from '@/features/ml/api/ml.types';
import { useHUBaseline } from '@/features/ml/hooks/use-hu-baseline';
import { ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/react-query/query-keys';
import { useLatestVisit } from '@/features/visits/hooks';
import { Fonts } from '../../constants/theme';

// ─── static data ─────────────────────────────────────────────────────────────
const FEATURES = [
  { label: 'Reticulocyte Count (ARC)', pct: 100 },
  { label: 'Haemoglobin (Hb)',          pct: 82  },
  { label: 'Baseline Hb at HU start',   pct: 67  },
  { label: 'Days on Hydroxyurea',        pct: 55  },
  { label: 'Age',                        pct: 42  },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

type Tier = 'responder' | 'uncertain' | 'non_responder';

function getTier(prob: number): Tier {
  if (prob >= 0.60) return 'responder';
  if (prob >= 0.40) return 'uncertain';
  return 'non_responder';
}

const TIER_CONFIG = {
  responder: {
    grad:      ['#16A34A', '#4ADE80'] as [string, string],
    pillBg:    '#DCFCE7',
    pillText:  '#16A34A',
    pillLabel: 'STABLE',
    icon:      'checkmark-circle' as const,
    headline:  'Likely Responder at Next Visit',
  },
  uncertain: {
    grad:      ['#D97706', '#FBBF24'] as [string, string],
    pillBg:    '#FEF9C3',
    pillText:  '#CA8A04',
    pillLabel: 'MONITOR',
    icon:      'alert-circle' as const,
    headline:  'Uncertain — Monitor Closely',
  },
  non_responder: {
    grad:      ['#EF4444', '#F87171'] as [string, string],
    pillBg:    '#FEE2E2',
    pillText:  '#DC2626',
    pillLabel: 'ELEVATED',
    icon:      'warning' as const,
    headline:  'Low Likelihood of HU Response',
  },
};

const CLINICAL_COPY = {
  responder:     'Continue current Hydroxyurea dose and schedule next follow-up as planned. Monitor Hb and ARC trends.',
  non_responder: 'Review HU dose and adherence. Consider escalating monitoring frequency or discussing dose adjustment with clinician.',
};

function parseErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Could not connect. Check your internet connection.';
  }
  const body = error.data as Record<string, unknown> | undefined;
  if (error.status === 400 && typeof body?.days_on_hu === 'number') {
    return `Only ${body.days_on_hu} days on HU — predictions require 90+ days. Check back later.`;
  }
  if (error.status === 400 && typeof body?.detail === 'string') {
    return body.detail;
  }
  if (error.status === 404) {
    return 'Visit not found. Try logging a new visit.';
  }
  if (error.status >= 500) {
    return 'Prediction service unavailable. Try again later.';
  }
  return error.message || 'Prediction failed. Please try again.';
}

// ─── component ────────────────────────────────────────────────────────────────
export default function PredictScreen() {
  const insets      = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);

  const { data: latestVisit, isLoading: visitLoading, error: visitError, refetch: refetchVisit } = useLatestVisit();
  const { data: baseline, isLoading: baselineLoading, error: baselineError, refetch: refetchBaseline } = useHUBaseline();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchVisit(), refetchBaseline()]);
    setRefreshing(false);
  }, [refetchVisit, refetchBaseline]);

  const noBaseline = baselineError instanceof ApiError && baselineError.status === 404;
  const noVisit    = visitError   instanceof ApiError && visitError.status   === 404;
  const hasBaseline = !!baseline;
  const hasVisit    = !!latestVisit?.id;

  const prerequisitesLoading = visitLoading || baselineLoading;

  const predictMutation = useMutation({
    mutationFn: (visitId: string) => predictHUResponse(visitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ml.latestPrediction });
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.latest });
    },
  });

  const handleGenerate = () => {
    if (!latestVisit?.id) return;
    predictMutation.mutate(latestVisit.id);
  };

  const result = predictMutation.data;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (predictMutation.isPending) {
    return (
      <View style={[s.screen, s.center, { paddingHorizontal: 28, gap: 16 }]}>
        <Skeleton height={180} radius={24} />
        <Skeleton height={80}  radius={20} />
        <Skeleton height={120} radius={20} />
        <Text style={[s.loadTitle, { marginTop: 8 }]}>Analysing your health data…</Text>
        <Text style={s.loadSub}>Processing key vital metrics</Text>
      </View>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (predictMutation.isSuccess && result) {
    const pct   = Math.round(result.response_probability * 100);
    const tier  = getTier(result.response_probability);
    const cfg   = TIER_CONFIG[tier];
    const copy  = CLINICAL_COPY[result.predicted_class] ?? CLINICAL_COPY.non_responder;

    return (
      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" colors={['#22C55E']} />
        }
      >
        {/* Result card */}
        <LinearGradient colors={cfg.grad} style={s.resultCard}>
          <View style={[s.pill, { backgroundColor: cfg.pillBg }]}>
            <Text style={[s.pillText, { color: cfg.pillText }]}>{cfg.pillLabel}</Text>
          </View>

          <Ionicons name={cfg.icon} size={44} color="#fff" style={{ marginBottom: 12 }} />

          <Text style={s.resultHeadline}>{cfg.headline}</Text>
          <Text style={s.resultPct}>{pct}% probability of response</Text>

          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${pct}%` }]} />
          </View>
        </LinearGradient>

        {/* Clinical Recommendation */}
        <View style={s.card}>
          <Text style={s.cardHead}>Clinical Recommendation</Text>
          <Text style={s.cardBody}>{copy}</Text>
        </View>

        {/* Feature Importance */}
        <View style={s.card}>
          <Text style={s.cardHead}>Key Prediction Factors</Text>
          <Text style={s.cardSub}>
            These are the factors that most influence the prediction for this patient population.
          </Text>
          {FEATURES.map((f, i) => (
            <View key={f.label} style={s.featureRow}>
              <Text style={s.featureNum}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.featureLabel}>{f.label}</Text>
                <View style={s.featTrack}>
                  <View style={[s.featFill, { width: `${f.pct}%` }]} />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Run Again */}
        <TouchableOpacity
          style={s.runAgainBtn}
          onPress={() => predictMutation.reset()}
          activeOpacity={0.8}
        >
          <Text style={s.runAgainText}>Run Again</Text>
        </TouchableOpacity>

        {/* Threshold note */}
        <Text style={s.threshold}>
          {`Prediction uses threshold: ${result.threshold} (${result.threshold_type}). Results are clinical decision support — not a diagnosis.`}
        </Text>
      </ScrollView>
    );
  }

  // ── Idle ──────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" colors={['#22C55E']} />
      }
    >
      <View style={s.idleCard}>
        <View style={s.iconWrap}>
          <Ionicons name="analytics" size={36} color="#22C55E" />
        </View>
        <Text style={s.idleTitle}>HU Response Prediction</Text>
        <Text style={s.idleSub}>
          Uses your most recent visit labs to predict your response at the next follow-up.
        </Text>

        {prerequisitesLoading ? (
          <View style={{ width: '100%', gap: 12, marginTop: 20 }}>
            <Skeleton height={14} width="70%" radius={6} style={{ alignSelf: 'center' }} />
            <Skeleton height={14} width="50%" radius={6} style={{ alignSelf: 'center' }} />
            <Skeleton height={48} radius={12} style={{ marginTop: 8 }} />
          </View>

        ) : noBaseline ? (
          /* ── No HU baseline ── */
          <View style={s.prereqBox}>
            <Ionicons name="flask-outline" size={20} color="#F59E0B" />
            <Text style={s.prereqTitle}>Set up your HU baseline first.</Text>
            <Text style={s.prereqText}>
              The prediction model needs your haemoglobin value from when you started Hydroxyurea.
            </Text>
            <TouchableOpacity
              style={s.logVisitBtn}
              onPress={() => router.push('/(log)/hu-baseline')}
              activeOpacity={0.8}
            >
              <Text style={s.logVisitBtnText}>Set Up Baseline</Text>
            </TouchableOpacity>
          </View>

        ) : noVisit ? (
          /* ── No visits ── */
          <View style={s.prereqBox}>
            <Ionicons name="information-circle-outline" size={20} color="#F59E0B" />
            <Text style={s.prereqText}>
              You need to log a visit first before generating a prediction.
            </Text>
            <TouchableOpacity
              style={s.logVisitBtn}
              onPress={() => router.push('/(tabs)/log')}
              activeOpacity={0.8}
            >
              <Text style={s.logVisitBtnText}>Log a Visit</Text>
            </TouchableOpacity>
          </View>

        ) : hasBaseline && hasVisit ? (
          /* ── Ready ── */
          <>
            {predictMutation.isError && (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                <Text style={s.errText}>{parseErrorMessage(predictMutation.error)}</Text>
              </View>
            )}
            <TouchableOpacity style={s.primaryBtn} onPress={handleGenerate} activeOpacity={0.8}>
              <Ionicons name="analytics" size={20} color="#fff" />
              <Text style={s.primaryBtnText}>Generate Prediction</Text>
            </TouchableOpacity>
          </>

        ) : null}
      </View>
    </ScrollView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8faf9' },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },

  // Loading
  loadTitle: { color: '#0f172a', fontFamily: Fonts.headingBold, fontSize: 20, marginBottom: 8, textAlign: 'center' },
  loadSub:   { color: '#64748b', fontFamily: Fonts.body, fontSize: 14, textAlign: 'center' },

  // Idle card
  idleCard: {
    alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  iconWrap: {
    alignItems: 'center', backgroundColor: '#dcfce7', borderRadius: 20,
    height: 72, justifyContent: 'center', marginBottom: 20, width: 72,
  },
  idleTitle: { color: '#0f172a', fontFamily: Fonts.headingBold, fontSize: 24, marginBottom: 10, textAlign: 'center' },
  idleSub:   { color: '#64748b', fontFamily: Fonts.body, fontSize: 14, lineHeight: 22, marginBottom: 24, textAlign: 'center' },

  // Prerequisite warning
  prereqBox: {
    alignItems: 'center', backgroundColor: '#fefce8', borderColor: '#fde68a',
    borderRadius: 16, borderWidth: 1, gap: 10, padding: 20, width: '100%',
  },
  prereqTitle: { color: '#92400e', fontFamily: Fonts.bodyBold,  fontSize: 14, textAlign: 'center' },
  prereqText:  { color: '#92400e', fontFamily: Fonts.body,      fontSize: 14, lineHeight: 20, textAlign: 'center' },
  logVisitBtn:     { backgroundColor: '#22C55E', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  logVisitBtnText: { color: '#fff', fontFamily: Fonts.bodyBold, fontSize: 15 },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 12,
    padding: 12, marginBottom: 12, width: '100%',
  },
  errText: { flex: 1, color: '#DC2626', fontFamily: Fonts.body, fontSize: 13, lineHeight: 18 },

  // Primary button
  primaryBtn: {
    alignItems: 'center', backgroundColor: '#16A34A', borderRadius: 16,
    flexDirection: 'row', gap: 10, justifyContent: 'center',
    paddingHorizontal: 28, paddingVertical: 16, width: '100%',
  },
  primaryBtnText: { color: '#fff', fontFamily: Fonts.bodyBold, fontSize: 16 },

  // Result card
  resultCard: {
    alignItems: 'center', borderRadius: 24, marginBottom: 16, padding: 24,
  },
  pill:     { borderRadius: 20, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 6 },
  pillText: { fontFamily: Fonts.bodyBold, fontSize: 12, letterSpacing: 0.8 },
  resultHeadline: {
    color: '#fff', fontFamily: Fonts.headingBold, fontSize: 22,
    marginBottom: 8, textAlign: 'center',
  },
  resultPct:  { color: 'rgba(255,255,255,0.9)', fontFamily: Fonts.bodySemiBold, fontSize: 16, marginBottom: 16 },
  barTrack:   {
    backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 6,
    height: 10, marginBottom: 12, overflow: 'hidden', width: '100%',
  },
  barFill: { backgroundColor: '#fff', borderRadius: 6, height: '100%' },

  // Info cards
  card: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHead: { color: '#0f172a', fontFamily: Fonts.bodySemiBold, fontSize: 16, marginBottom: 10 },
  cardBody: { color: '#334155', fontFamily: Fonts.body, fontSize: 14, lineHeight: 22 },
  cardSub:  { color: '#64748b', fontFamily: Fonts.body, fontSize: 13, lineHeight: 20, marginBottom: 16 },

  // Feature importance
  featureRow:   { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 12 },
  featureNum:   { color: '#64748b', fontFamily: Fonts.bodyBold, fontSize: 13, width: 18 },
  featureLabel: { color: '#0f172a', fontFamily: Fonts.bodySemiBold, fontSize: 13, marginBottom: 6 },
  featTrack:    { backgroundColor: '#f1f5f9', borderRadius: 4, height: 6, overflow: 'hidden' },
  featFill:     { backgroundColor: '#22C55E', borderRadius: 4, height: '100%' },

  // Run Again + threshold
  runAgainBtn: {
    alignItems: 'center', marginBottom: 12, paddingVertical: 16,
  },
  runAgainText: { color: '#0f172a', fontFamily: Fonts.bodySemiBold, fontSize: 15 },
  threshold:    { color: '#94a3b8', fontFamily: Fonts.body, fontSize: 11, lineHeight: 16, marginBottom: 24, textAlign: 'center' },
});
