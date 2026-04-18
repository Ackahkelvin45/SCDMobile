import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PRIMARY, PRIMARY_DARK, Fonts } from '../../constants/theme';

const { width } = Dimensions.get('window');
const CHART_H = 90;

const PAIN_DATA = [
  { day: 'Mon', value: 3 },
  { day: 'Tue', value: 2 },
  { day: 'Wed', value: 5 },
  { day: 'Thu', value: 8 },
  { day: 'Fri', value: 3 },
  { day: 'Sat', value: 1 },
  { day: 'Sun', value: 1 },
];

function barColor(value: number) {
  if (value >= 7) return '#ef4444';
  if (value >= 5) return '#f59e0b';
  return '#86efac';
}

const MEDICATIONS = [
  { name: 'Hydroxyurea', dose: '500 mg', time: '08:00 AM', taken: true,  icon: 'medkit' as const },
  { name: 'Folic Acid',  dose: '5 mg',   time: '08:00 AM', taken: true,  icon: 'leaf'   as const },
  { name: 'Penicillin',  dose: '250 mg', time: '08:00 PM', taken: false, icon: 'flask'  as const },
];

const QUICK_ACTIONS = [
  { icon: 'add-circle-outline' as const, label: 'Log Symptoms',  variant: 'light' as const },
  { icon: 'flask-outline'      as const, label: 'Add Lab Data',  variant: 'light' as const },
  { icon: 'medkit-outline'     as const, label: 'Medications',   variant: 'gray'  as const },
  { icon: 'analytics-outline'  as const, label: 'Predict Risk',  variant: 'dark'  as const },
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const CARD_W = (width - 40 - 12) / 2;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={18} color={PRIMARY} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerSmall}>Good morning,</Text>
            <Text style={styles.headerName}>Kwame 👋</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={20} color="#0f172a" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* ── Risk Level Card ── */}
        <LinearGradient
          colors={[PRIMARY, PRIMARY_DARK, '#0b5226']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.riskCard}
        >
          <View style={styles.riskTopRow}>
            <Text style={styles.riskCardLabel}>Current Risk Level</Text>
            <View style={styles.stablePill}>
              <View style={styles.stableDot} />
              <Text style={styles.stableText}>STABLE</Text>
            </View>
          </View>
          <Text style={styles.riskMain}>
            Low<Text style={styles.riskSub}> probability of crisis</Text>
          </Text>
          <Text style={styles.riskDesc}>
            Your vitals have been consistent over the last 48 hours. Keep up with hydration.
          </Text>

          {/* Mini stats inside card */}
          <View style={styles.riskStatsRow}>
            {[
              { label: 'Hb', value: '11.2', unit: 'g/dL' },
              { label: 'WBC', value: '8.4', unit: 'k/uL' },
              { label: 'Pain', value: '2', unit: '/10' },
            ].map((s, i) => (
              <View key={s.label} style={[styles.riskStat, i < 2 && styles.riskStatDivider]}>
                <Text style={styles.riskStatValue}>{s.value}<Text style={styles.riskStatUnit}> {s.unit}</Text></Text>
                <Text style={styles.riskStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Pain Trend ── */}
        <SectionHeader title="Pain Trend" onSeeAll={() => {}} />
        <View style={styles.chartCard}>
          <Text style={styles.chartSubtitle}>Last 7 days</Text>
          <View style={styles.chartArea}>
            <View style={[styles.guideLine, { bottom: CHART_H * 0.65 }]} />
            <View style={[styles.guideLine, { bottom: CHART_H * 0.35 }]} />
            <View style={styles.barsRow}>
              {PAIN_DATA.map((item) => (
                <View key={item.day} style={styles.barGroup}>
                  <Text style={styles.barValue}>{item.value}</Text>
                  <View
                    style={[
                      styles.bar,
                      { height: Math.max(6, (item.value / 10) * CHART_H), backgroundColor: barColor(item.value) },
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
        <SectionHeader title="Today's Medications" onSeeAll={() => {}} />
        <View style={styles.medCard}>
          {MEDICATIONS.map((med, i) => (
            <View key={med.name} style={[styles.medRow, i < MEDICATIONS.length - 1 && styles.medDivider]}>
              <View style={[styles.medIconBox, med.taken && styles.medIconBoxTaken]}>
                <Ionicons name={med.icon} size={18} color={med.taken ? PRIMARY_DARK : '#94a3b8'} />
              </View>
              <View style={styles.medInfo}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medDose}>{med.dose} · {med.time}</Text>
              </View>
              <View style={[styles.medStatus, med.taken && styles.medStatusTaken]}>
                <Ionicons
                  name={med.taken ? 'checkmark' : 'time-outline'}
                  size={14}
                  color={med.taken ? PRIMARY_DARK : '#94a3b8'}
                />
                <Text style={[styles.medStatusText, med.taken && styles.medStatusTextTaken]}>
                  {med.taken ? 'Taken' : 'Pending'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Quick Actions ── */}
        <SectionHeader title="Quick Actions" />
        <View style={[styles.grid, { gap: 12 }]}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.actionCard, { width: CARD_W }, a.variant === 'dark' && styles.actionCardDark]}
              activeOpacity={0.8}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: `${PRIMARY}18`,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerSmall: { fontSize: 12, fontFamily: Fonts.body, color: '#64748b' },
  headerName:  { fontSize: 16, fontFamily: Fonts.bodyBold, color: '#0f172a' },
  bellBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  notifDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5, borderColor: '#fff',
  },

  // Risk card
  riskCard: { borderRadius: 22, padding: 20, marginBottom: 24 },
  riskTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  riskCardLabel: { fontSize: 12, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.75)' },
  stablePill: {
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  stableDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  stableText: { fontSize: 10, fontFamily: Fonts.bodyBold, color: PRIMARY_DARK, letterSpacing: 0.8 },
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
  medStatusText: { fontSize: 11, fontFamily: Fonts.bodySemiBold, color: '#94a3b8' },
  medStatusTextTaken: { color: PRIMARY_DARK },

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
