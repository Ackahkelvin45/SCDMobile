import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useVisit } from '@/features/visits/hooks';
import type { Visit, VisitStatus } from '@/features/visits/api';
import { Fonts } from '../../constants/theme';

const BACKGROUND = '#f8faf9';
const CARD_BG    = '#ffffff';
const MUTED      = '#64748b';
const DARK       = '#0f172a';

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<VisitStatus, { bg: string; color: string; label: string }> = {
  STABLE:   { bg: '#DCFCE7', color: '#16A34A', label: 'STABLE'   },
  MONITOR:  { bg: '#FEF9C3', color: '#CA8A04', label: 'MONITOR'  },
  ELEVATED: { bg: '#FEE2E2', color: '#DC2626', label: 'ELEVATED' },
};

const PREDICTION_CONFIG = {
  responder:     { bg: '#DCFCE7', color: '#16A34A', label: 'Likely Responder'     },
  non_responder: { bg: '#FEE2E2', color: '#DC2626', label: 'Low Likelihood'       },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function val(v: string | number | null | undefined, unit?: string): string {
  if (v === null || v === undefined) return '—';
  return unit ? `${v} ${unit}` : String(v);
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function LabRow({ label, value, unit, highlight }: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  highlight?: boolean;
}) {
  const display = val(value, unit);
  const missing = display === '—';
  return (
    <View style={s.labRow}>
      <Text style={s.labLabel}>{label}</Text>
      <Text style={[s.labValue, missing && s.labMissing, highlight && !missing && s.labHighlight]}>
        {display}
      </Text>
    </View>
  );
}

function ToxicityFlag({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={[s.toxFlag, active ? s.toxActive : s.toxInactive]}>
      <Ionicons
        name={active ? 'checkmark-circle' : 'ellipse-outline'}
        size={14}
        color={active ? '#DC2626' : '#94a3b8'}
      />
      <Text style={[s.toxLabel, active && s.toxLabelActive]}>{label}</Text>
    </View>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export default function VisitDetailScreen() {
  const insets = useSafeAreaInsets();
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { data: visit, isLoading, error } = useVisit(visitId);

  if (isLoading) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  if (error || !visit) {
    return (
      <View style={[s.screen, s.center]}>
        <Ionicons name="alert-circle-outline" size={40} color={MUTED} style={{ marginBottom: 12 }} />
        <Text style={s.errorText}>Could not load visit details.</Text>
      </View>
    );
  }

  const statusCfg     = STATUS_CONFIG[visit.status]              ?? STATUS_CONFIG.MONITOR;
  const predCfg       = visit.predicted_class
    ? PREDICTION_CONFIG[visit.predicted_class]
    : null;

  const anyToxicity = visit.toxicity_nausea || visit.toxicity_vomiting || visit.toxicity_rash ||
    visit.toxicity_fatigue || visit.toxicity_headache || visit.toxicity_neutropenia;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Visit header ── */}
      <View style={s.headerCard}>
        <View style={s.headerTop}>
          <View style={s.headerLeft}>
            <Text style={s.visitDateLabel}>VISIT DATE</Text>
            <Text style={s.visitDate}>{formatDate(visit.visit_date)}</Text>
          </View>
          <View style={[s.statusPill, { backgroundColor: statusCfg.bg }]}>
            <Text style={[s.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {predCfg && (
          <View style={[s.predRow, { backgroundColor: predCfg.bg }]}>
            <Ionicons name="analytics-outline" size={14} color={predCfg.color} />
            <Text style={[s.predText, { color: predCfg.color }]}>
              ML Prediction: {predCfg.label}
            </Text>
          </View>
        )}
      </View>

      {/* ── Blood count ── */}
      <SectionCard title="Full Blood Count">
        <LabRow label="Haemoglobin (Hb)"    value={visit.hgb}           unit="g/dL" highlight />
        <LabRow label="Haematocrit (HCT)"   value={visit.hct}           unit="%"    />
        <LabRow label="White Blood Cells"   value={visit.wbc}           unit="k/μL" />
        <LabRow label="Red Blood Cells"     value={visit.rbc}           unit="M/μL" />
        <LabRow label="Platelets"           value={visit.platelet_count} unit="k/μL" />
        <LabRow label="MCV"                 value={visit.mcv}           unit="fL"   />
        <LabRow label="ANC"                 value={visit.anc}           unit="/μL"  />
        <LabRow label="ARC (Reticulocytes)" value={visit.arc}           unit="/μL"  highlight />
      </SectionCard>

      {/* ── Pain ── */}
      <SectionCard title="Pain & Symptoms">
        <View style={s.painRow}>
          <Text style={s.painLabel}>Pain Episodes</Text>
          <View style={s.painBadge}>
            <Text style={s.painValue}>{visit.pain_episodes}</Text>
          </View>
        </View>
        <View style={s.painBarTrack}>
          <View
            style={[
              s.painBarFill,
              {
                width: `${Math.min(100, (visit.pain_episodes / 10) * 100)}%`,
                backgroundColor: visit.pain_episodes >= 7
                  ? '#EF4444'
                  : visit.pain_episodes >= 5
                  ? '#F59E0B'
                  : '#22C55E',
              },
            ]}
          />
        </View>
        <Text style={s.painScale}>0 — 10 scale</Text>
      </SectionCard>

      {/* ── Toxicity ── */}
      <SectionCard title="Hydroxyurea Toxicity Flags">
        {anyToxicity ? null : (
          <Text style={s.noToxText}>No toxicity flags recorded for this visit.</Text>
        )}
        <View style={s.toxGrid}>
          <ToxicityFlag label="Nausea"       active={visit.toxicity_nausea}       />
          <ToxicityFlag label="Vomiting"     active={visit.toxicity_vomiting}     />
          <ToxicityFlag label="Rash"         active={visit.toxicity_rash}         />
          <ToxicityFlag label="Fatigue"      active={visit.toxicity_fatigue}      />
          <ToxicityFlag label="Headache"     active={visit.toxicity_headache}     />
          <ToxicityFlag label="Neutropenia"  active={visit.toxicity_neutropenia}  />
        </View>
      </SectionCard>

      {/* ── Logged at ── */}
      <Text style={s.loggedAt}>
        Logged {new Date(visit.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </Text>
    </ScrollView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: BACKGROUND },
  center:  { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },

  // Header card
  headerCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    gap: 12,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerLeft: { flex: 1, paddingRight: 12 },
  visitDateLabel: { color: MUTED, fontFamily: Fonts.bodySemiBold, fontSize: 10, letterSpacing: 0.8, marginBottom: 4 },
  visitDate:      { color: DARK,  fontFamily: Fonts.headingBold,  fontSize: 18 },

  statusPill: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  statusText: { fontFamily: Fonts.bodyBold, fontSize: 11, letterSpacing: 0.6 },

  predRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  predText: { fontFamily: Fonts.bodySemiBold, fontSize: 13 },

  // Section card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    gap: 2,
  },
  cardTitle: { color: DARK, fontFamily: Fonts.bodySemiBold, fontSize: 15, marginBottom: 14 },

  // Lab rows
  labRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F4F4F5' },
  labLabel:    { color: MUTED, fontFamily: Fonts.body, fontSize: 14, flex: 1 },
  labValue:    { color: DARK,  fontFamily: Fonts.bodyBold, fontSize: 14 },
  labMissing:  { color: '#cbd5e1', fontFamily: Fonts.body },
  labHighlight:{ color: '#16A34A' },

  // Pain
  painRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  painLabel:   { color: MUTED, fontFamily: Fonts.body, fontSize: 14 },
  painBadge:   { backgroundColor: '#F4F4F5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  painValue:   { color: DARK, fontFamily: Fonts.headingBold, fontSize: 18 },
  painBarTrack:{ backgroundColor: '#F4F4F5', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 6 },
  painBarFill: { height: '100%', borderRadius: 6 },
  painScale:   { color: '#94a3b8', fontFamily: Fonts.body, fontSize: 11 },

  // Toxicity
  noToxText: { color: MUTED, fontFamily: Fonts.body, fontSize: 13, marginBottom: 8 },
  toxGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  toxFlag:   { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  toxActive:       { backgroundColor: '#FEE2E2' },
  toxInactive:     { backgroundColor: '#F4F4F5' },
  toxLabel:        { color: '#64748b', fontFamily: Fonts.body, fontSize: 13 },
  toxLabelActive:  { color: '#DC2626', fontFamily: Fonts.bodySemiBold },

  // Footer
  loggedAt:  { color: '#94a3b8', fontFamily: Fonts.body, fontSize: 11, textAlign: 'center', paddingVertical: 8 },
  errorText: { color: MUTED, fontFamily: Fonts.body, fontSize: 14 },
});
