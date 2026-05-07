import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { PRIMARY, PRIMARY_DARK, Fonts } from '../../constants/theme';
import { useLatestVisit, useVisitTrends } from '@/features/visits/hooks';
import { useLatestPrediction } from '@/features/ml/hooks/use-latest-prediction';
import { useTodayMedication } from '@/features/medications/hooks';
import { Skeleton } from '@/components/Skeleton';
import type { TrendDay } from '@/features/visits/api';

const { width } = Dimensions.get('window');
const CHART_H = 90;

// ─── types ────────────────────────────────────────────────────────────────────

// ─── helpers ──────────────────────────────────────────────────────────────────

function barColor(value: number) {
  if (value >= 7) return '#ef4444';
  if (value >= 5) return '#f59e0b';
  return '#86efac';
}

function buildPainChartData(days: TrendDay[]): { day: string; value: number }[] {
  return days.map((d) => ({ day: d.day_label, value: d.pain_episodes ?? 0 }));
}

function pillStyle(predicted_class?: 'responder' | 'non_responder') {
  if (predicted_class === 'non_responder') return { bg: '#FEE2E2', dot: '#DC2626', text: 'ELEVATED', textColor: '#DC2626' };
  if (predicted_class === 'responder')     return { bg: 'rgba(255,255,255,0.92)', dot: PRIMARY, text: 'STABLE', textColor: PRIMARY_DARK };
  return                                          { bg: '#FEF9C3', dot: '#CA8A04', text: 'MONITOR', textColor: '#CA8A04' };
}

const QUICK_ACTIONS = [
  { icon: 'add-circle-outline' as const, label: 'Log Symptoms',        variant: 'light' as const, href: '/(log)/symptoms'  as const },
  { icon: 'flask-outline'      as const, label: 'Add Lab Data',        variant: 'light' as const, href: '/(tabs)/log'      as const },
  { icon: 'medkit-outline'     as const, label: 'Medications',         variant: 'gray'  as const, href: '/(log)/medication' as const },
  { icon: 'analytics-outline'  as const, label: 'Predict HU Response', variant: 'dark'  as const, href: '/(tabs)/predict'  as const },
] as const;

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const CARD_W = (width - 40 - 12) / 2;
  const [refreshing, setRefreshing] = useState(false);

  const { data: latestVisit, isLoading: visitLoading, refetch: refetchVisit } = useLatestVisit();
  const { data: trendsData, refetch: refetchTrends }                          = useVisitTrends(7);
  const { data: todayMed, refetch: refetchMed, isLoading: medLoading, isError: medError } = useTodayMedication();
  const { data: prediction, isLoading: predLoading, refetch: refetchPrediction } = useLatestPrediction();

  const heroLoading = visitLoading || predLoading;

  useFocusEffect(
    React.useCallback(() => {
      refetchMed();
    }, [refetchMed])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchVisit(), refetchTrends(), refetchMed(), refetchPrediction()]);
    setRefreshing(false);
  }, [refetchVisit, refetchTrends, refetchMed, refetchPrediction]);

  const painData = trendsData ? buildPainChartData(trendsData.days) : [];
  const pill     = pillStyle(prediction?.predicted_class);

  const riskHeadline =
    prediction?.predicted_class === 'responder'     ? 'High'  :
    prediction?.predicted_class === 'non_responder' ? 'Low'   : '--';
  const riskDesc =
    prediction?.predicted_class === 'responder'
      ? 'High likelihood of HU response at next follow-up. Keep up with your current dose.'
      : prediction?.predicted_class === 'non_responder'
      ? 'Low likelihood of HU response at next follow-up. Speak with your clinician.'
      : 'Log a visit to generate your first prediction.';

  const miniStats = [
    { label: 'Hb',   value: latestVisit?.hgb            ?? '--', unit: 'g/dL' },
    { label: 'WBC',  value: latestVisit?.wbc             ?? '--', unit: 'k/uL' },
    { label: 'Pain', value: latestVisit?.pain_episodes   != null ? String(latestVisit.pain_episodes) : '--', unit: '/10' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {/* ── Risk Level Card ── */}
        {heroLoading ? (
          <View style={[styles.riskCard, { backgroundColor: '#e2e8f0', gap: 16 }]}>
            <Skeleton height={12} width="50%" radius={6} />
            <Skeleton height={36} width="40%" radius={8} />
            <Skeleton height={14} width="90%" radius={6} />
            <Skeleton height={14} width="70%" radius={6} />
            <Skeleton height={56} radius={14} style={{ marginTop: 8 }} />
          </View>
        ) : (
        <LinearGradient
          colors={[PRIMARY, PRIMARY_DARK, '#0b5226']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.riskCard}
        >
          <View style={styles.riskTopRow}>
            <Text style={styles.riskCardLabel}>HU Response Outlook</Text>
            <View style={[styles.stablePill, { backgroundColor: pill.bg }]}>
              <View style={[styles.stableDot, { backgroundColor: pill.dot }]} />
              <Text style={[styles.stableText, { color: pill.textColor }]}>{pill.text}</Text>
            </View>
          </View>
          <Text style={styles.riskMain}>
            {riskHeadline}
            {riskHeadline !== '--' && (
              <Text style={styles.riskSub}> likelihood of HU response</Text>
            )}
          </Text>
          <Text style={styles.riskDesc}>{riskDesc}</Text>

          <View style={styles.riskStatsRow}>
            {miniStats.map((s, i) => (
              <View key={s.label} style={[styles.riskStat, i < 2 && styles.riskStatDivider]}>
                <Text style={styles.riskStatValue}>{s.value}<Text style={styles.riskStatUnit}> {s.unit}</Text></Text>
                <Text style={styles.riskStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
        )}

        {/* ── Pain Trend ── */}
        <SectionHeader title="Pain Trend" onSeeAll={() => router.push('/(tabs)/history')} />
        <View style={styles.chartCard}>
          <Text style={styles.chartSubtitle}>Last 7 days</Text>
          <View style={styles.chartArea}>
            <View style={[styles.guideLine, { bottom: CHART_H * 0.65 }]} />
            <View style={[styles.guideLine, { bottom: CHART_H * 0.35 }]} />
            <View style={styles.barsRow}>
              {painData.map((item, i) => (
                <View key={i} style={styles.barGroup}>
                  <Text style={styles.barValue}>{item.value > 0 ? item.value : ''}</Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: item.value > 0 ? Math.max(6, (item.value / 10) * CHART_H) : 6,
                        backgroundColor: item.value > 0 ? barColor(item.value) : '#e2e8f0',
                      },
                    ]}
                  />
                  <Text style={styles.barDay}>{item.day}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.legendRow}>
            {[
              { color: '#86efac', label: 'Low (1–4)' },
              { color: '#f59e0b', label: 'Moderate (5–6)' },
              { color: '#ef4444', label: 'High (7+)' },
            ].map((l) => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Today's Medications ── */}
        {!medError && (
          <>
            <SectionHeader title="Today's Medications" onSeeAll={() => router.push('/(log)/medication')} />
            <View style={styles.medCard}>
              {medLoading ? (
                <View style={[styles.medRow, styles.medSkeleton]} />
              ) : !todayMed ? null : !todayMed.logged ? (
                <View style={styles.medRow}>
                  <View style={styles.medIconBox}>
                    <Ionicons name="time-outline" size={18} color="#94a3b8" />
                  </View>
                  <View style={styles.medInfo}>
                    <Text style={styles.medName}>HU dose not logged yet</Text>
                    <Text style={styles.medDose}>Tap to log today's dose</Text>
                  </View>
                  <View style={[styles.medStatus]}>
                    <Ionicons name="time-outline" size={14} color="#94a3b8" />
                    <Text style={styles.medStatusText}>Pending</Text>
                  </View>
                </View>
              ) : todayMed.hu_taken ? (
                <View style={styles.medRow}>
                  <View style={[styles.medIconBox, styles.medIconBoxTaken]}>
                    <Ionicons name="medkit" size={18} color={PRIMARY_DARK} />
                  </View>
                  <View style={styles.medInfo}>
                    <Text style={styles.medName}>HU {todayMed.dose_mg} mg — taken today</Text>
                    <Text style={styles.medDose}>Logged today</Text>
                  </View>
                  <View style={[styles.medStatus, styles.medStatusTaken]}>
                    <Ionicons name="checkmark" size={14} color={PRIMARY_DARK} />
                    <Text style={[styles.medStatusText, styles.medStatusTextTaken]}>Taken</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.medRow}>
                  <View style={[styles.medIconBox, styles.medIconBoxSkipped]}>
                    <Ionicons name="medkit" size={18} color="#d97706" />
                  </View>
                  <View style={styles.medInfo}>
                    <Text style={styles.medName}>HU dose skipped today</Text>
                    <Text style={styles.medDose}>Logged as skipped</Text>
                  </View>
                  <View style={[styles.medStatus, styles.medStatusSkipped]}>
                    <Ionicons name="close" size={14} color="#d97706" />
                    <Text style={[styles.medStatusText, styles.medStatusTextSkipped]}>Skipped</Text>
                  </View>
                </View>
              )}

              {/* Log dose shortcut when not yet logged */}
              {todayMed && !todayMed.logged && (
                <TouchableOpacity
                  style={styles.logDoseBtn}
                  activeOpacity={0.8}
                  onPress={() => router.push('/(log)/medication')}
                >
                  <Text style={styles.logDoseBtnText}>Log dose</Text>
                  <Ionicons name="arrow-forward" size={14} color={PRIMARY_DARK} />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ── Quick Actions ── */}
        <SectionHeader title="Quick Actions" />
        <View style={[styles.grid, { gap: 12 }]}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.actionCard, { width: CARD_W }, a.variant === 'dark' && styles.actionCardDark]}
              activeOpacity={0.8}
              onPress={() => router.push(a.href)}
            >
              <View style={[
                styles.actionIconBox,
                a.variant === 'light' && styles.aibLight,
                a.variant === 'gray'  && styles.aibGray,
                a.variant === 'dark'  && styles.aibDark,
              ]}>
                <Ionicons
                  name={a.icon}
                  size={22}
                  color={a.variant === 'dark' ? '#fff' : a.variant === 'gray' ? '#64748b' : PRIMARY}
                />
              </View>
              <Text style={[styles.actionLabel, a.variant === 'dark' && styles.actionLabelDark]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9f4' },
  scroll:    { paddingHorizontal: 20, paddingTop: 16 },

  // Risk card
  riskCard: { borderRadius: 22, padding: 20, marginBottom: 24 },
  riskTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  riskCardLabel: { fontSize: 12, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.75)' },
  stablePill: {
    borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  stableDot: { width: 6, height: 6, borderRadius: 3 },
  stableText: { fontSize: 10, fontFamily: Fonts.bodyBold, letterSpacing: 0.8 },
  riskMain: { fontSize: 34, fontFamily: Fonts.headingBold, color: '#fff', marginBottom: 6 },
  riskSub:  { fontSize: 15, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.85)' },
  riskDesc: { fontSize: 12, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.7)', lineHeight: 18, marginBottom: 16 },
  riskStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 12,
  },
  riskStat: { flex: 1, alignItems: 'center' },
  riskStatDivider: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)' },
  riskStatValue: { fontSize: 18, fontFamily: Fonts.headingBold, color: '#fff' },
  riskStatUnit:  { fontSize: 10, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.75)' },
  riskStatLabel: { fontSize: 11, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontFamily: Fonts.bodyBold, color: '#0f172a' },
  seeAll: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: PRIMARY },

  // Chart
  chartCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  chartSubtitle: { fontSize: 12, fontFamily: Fonts.body, color: '#94a3b8', marginBottom: 16 },
  chartArea:  { height: CHART_H + 32, position: 'relative', marginBottom: 12 },
  guideLine:  { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#f1f5f9' },
  barsRow:    { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: CHART_H + 32 },
  barGroup:   { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: CHART_H + 32 },
  barValue:   { fontSize: 9, fontFamily: Fonts.bodySemiBold, color: '#64748b', marginBottom: 3 },
  bar:        { width: 22, borderRadius: 6, marginBottom: 6 },
  barDay:     { fontSize: 10, fontFamily: Fonts.body, color: '#94a3b8' },
  legendRow:  { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: Fonts.body, color: '#64748b' },

  // Medications
  medCard: {
    backgroundColor: '#fff', borderRadius: 18, marginBottom: 24, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  medRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  medDivider: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  medIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  medIconBoxTaken: { backgroundColor: `${PRIMARY}18` },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: '#0f172a', marginBottom: 3 },
  medDose: { fontSize: 12, fontFamily: Fonts.body, color: '#94a3b8' },
  medStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f1f5f9', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  medStatusTaken: { backgroundColor: `${PRIMARY}18` },
  medStatusSkipped: { backgroundColor: '#fef3c7' },
  medStatusText: { fontSize: 11, fontFamily: Fonts.bodySemiBold, color: '#94a3b8' },
  medStatusTextTaken: { color: PRIMARY_DARK },
  medStatusTextSkipped: { color: '#d97706' },
  medIconBoxSkipped: { backgroundColor: '#fef3c7' },
  medSkeleton: { height: 72, backgroundColor: '#f1f5f9', borderRadius: 8 },
  logDoseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  logDoseBtnText: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: PRIMARY_DARK },

  // Quick actions
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  actionCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20,
    alignItems: 'center', gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  actionCardDark: { backgroundColor: PRIMARY_DARK },
  actionIconBox:  { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  aibLight: { backgroundColor: `${PRIMARY}20` },
  aibGray:  { backgroundColor: '#f1f5f9' },
  aibDark:  { backgroundColor: 'rgba(255,255,255,0.18)' },
  actionLabel:     { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: '#0f172a', textAlign: 'center' },
  actionLabelDark: { color: '#fff' },
});
