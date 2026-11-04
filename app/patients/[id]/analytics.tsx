// One page with everything measurable about a single patient, for one period (6m / 12m / all).
// Numbers come from the patient summary's `analytics` block; charts from /trends/ with the same period.
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LineChart } from '@/components/LineChart';
import { Card, ErrorState, KeyValue, Loading, Screen, SectionTitle, Segmented, ui } from '@/components/ui';
import { FLAG_RULE_LABELS, GENOTYPES } from '@/constants/clinical';
import { C, Fonts } from '@/constants/theme';
import { useConfig, usePatient, useTrends } from '@/hooks/api';
import { errorMessage } from '@/lib/api/api-error';
import type { TrendsResponse } from '@/lib/api/types';
import { formatDate, formatDelta, toIsoDate } from '@/lib/clinical';

type Period = '6m' | '12m' | 'all';
const PERIODS: { value: Period; label: string }[] = [
  { value: '6m', label: '6 months' },
  { value: '12m', label: '12 months' },
  { value: 'all', label: 'All time' },
];
const LABS = ['hgb', 'anc', 'platelet_count', 'mcv', 'dose_mg_per_kg', 'pain_episodes'];

function periodStart(p: Period): string | undefined {
  if (p === 'all') return undefined;
  const d = new Date();
  d.setMonth(d.getMonth() - (p === '6m' ? 6 : 12));
  return toIsoDate(d);
}

const val = (n: number | null | undefined, unit = '') => (n === null || n === undefined ? '—' : `${n}${unit}`);

export default function PatientAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [period, setPeriod] = useState<Period>('all');
  const patient = usePatient(id, period);
  const trends = useTrends(id, LABS, periodStart(period));
  const units = useConfig().data?.lab_ranges;
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([patient.refetch(), trends.refetch()]);
    setRefreshing(false);
  };

  if (patient.isLoading) return <><Stack.Screen options={{ title: 'Analytics' }} /><Loading /></>;
  if (!patient.data) {
    return <><Stack.Screen options={{ title: 'Analytics' }} /><ErrorState message={errorMessage(patient.error)} onRetry={() => patient.refetch()} /></>;
  }

  const p = patient.data;
  const a = p.analytics;
  const obs = p.observed_response;
  const genotype = GENOTYPES.find((g) => g.value === p.genotype)?.label ?? p.genotype;
  const assessedPct = a.hgb.visits_assessed ? a.hgb.visits_meeting_criterion / a.hgb.visits_assessed : 0;
  const adherenceTotal = a.adherence.good + a.adherence.partial + a.adherence.poor;
  const rules = Object.entries(a.toxicity.by_rule).sort((x, y) => y[1] - x[1]);
  const t = trends.data;

  const chart = (lab: string, title: string, unit?: string) => (
    <TrendChart trends={t} loading={trends.isLoading} error={trends.isError ? errorMessage(trends.error) : null}
      onRetry={() => trends.refetch()} lab={lab} title={title} unit={unit ?? units?.[lab as keyof typeof units]?.unit} />
  );

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: 'Analytics' }} />

      <View style={{ gap: 2 }}>
        <Text style={ui.h1}>{p.full_name}</Text>
        <Text style={ui.muted}>
          Folder {p.folder_number} · {p.age_years} y · {genotype}{p.hu ? ` · day ${p.hu.days_on_hu} on HU` : ' · no baseline'}
        </Text>
      </View>

      <Segmented value={period} onChange={setPeriod} options={PERIODS} />

      <View style={st.tiles}>
        <Tile label="Visits" value={String(a.visit_count)} />
        <Tile label="Latest Hb vs baseline" value={obs?.delta_hgb != null ? `${formatDelta(obs.delta_hgb)}` : '—'} unit="g/dL"
          tone={obs?.meets_criterion === true ? 'good' : obs?.meets_criterion === false ? 'warn' : undefined} />
        <Tile label="Safety flags" value={String(a.toxicity.flags_total)} sub={a.toxicity.critical ? `${a.toxicity.critical} critical` : undefined}
          tone={a.toxicity.critical ? 'bad' : undefined} />
        <Tile label="Pain episodes" value={String(a.pain_episodes.total)} sub={a.pain_episodes.per_visit_avg != null ? `${a.pain_episodes.per_visit_avg} per visit` : undefined} />
      </View>

      <SectionTitle title="Response to HU" />
      <Card>
        <Text style={ui.bodyBold}>
          {a.hgb.visits_meeting_criterion} of {a.hgb.visits_assessed} assessed visits met the +1.0 g/dL criterion
        </Text>
        <Bar fraction={assessedPct} color={C.primaryDark} label={`${Math.round(assessedPct * 100)}% of assessed visits`} />
        <Text style={ui.muted}>Assessed = on HU for 90+ days and not transfused in the previous 3 months.</Text>
        <View style={ui.divider} />
        <KeyValue label="Baseline Hb" value={p.hu ? `${p.hu.baseline_hgb} g/dL` : '—'} />
        <KeyValue label="Hb low / average / high" value={`${val(a.hgb.min)} / ${val(a.hgb.mean)} / ${val(a.hgb.max)} g/dL`} />
        {chart('hgb', 'Haemoglobin', 'g/dL')}
      </Card>

      <SectionTitle title="Safety" />
      <Card>
        <KeyValue label="Flags raised" value={`${a.toxicity.flags_total} (${a.toxicity.critical} critical)`} />
        {rules.length ? rules.map(([rule, n]) => (
          <KeyValue key={rule} label={FLAG_RULE_LABELS[rule] ?? rule.replace(/_/g, ' ')} value={String(n)} />
        )) : <Text style={ui.muted}>No safety flags in this period.</Text>}
        <View style={ui.divider} />
        {chart('anc', 'ANC')}
        {chart('platelet_count', 'Platelets')}
      </Card>

      <SectionTitle title="Treatment and adherence" />
      <Card>
        <KeyValue label="Current dose" value={a.dose.current_mg == null ? '—'
          : `${a.dose.current_mg} mg${a.dose.current_mg_per_kg != null ? ` · ${a.dose.current_mg_per_kg} mg/kg` : ''}`} />
        <KeyValue label="Dose changes" value={String(a.dose.changes)} />
        {chart('dose_mg_per_kg', 'Dose', 'mg/kg')}
        <View style={ui.divider} />
        <Text style={ui.bodyBold}>Adherence (visits recorded)</Text>
        {adherenceTotal ? (
          <>
            <View style={st.stack} accessible accessibilityLabel={`Adherence: good ${a.adherence.good}, partial ${a.adherence.partial}, poor ${a.adherence.poor}`}>
              {a.adherence.good ? <View style={{ flex: a.adherence.good, backgroundColor: C.primaryDark }} /> : null}
              {a.adherence.partial ? <View style={{ flex: a.adherence.partial, backgroundColor: '#d97706' }} /> : null}
              {a.adherence.poor ? <View style={{ flex: a.adherence.poor, backgroundColor: C.danger }} /> : null}
            </View>
            <View style={ui.wrap}>
              <Legend color={C.primaryDark} text={`Good ${a.adherence.good}`} />
              <Legend color="#d97706" text={`Partial ${a.adherence.partial}`} />
              <Legend color={C.danger} text={`Poor ${a.adherence.poor}`} />
            </View>
          </>
        ) : <Text style={ui.muted}>No adherence recorded in this period.</Text>}
        <View style={ui.divider} />
        <KeyValue label="MCV change (adherence sign)" value={a.mcv.change == null ? '—' : `${formatDelta(a.mcv.change, 0)} fL (${val(a.mcv.first)} → ${val(a.mcv.latest)})`} />
        <Text style={ui.muted}>MCV usually rises when HU is taken regularly.</Text>
        {chart('mcv', 'MCV')}
      </Card>

      <SectionTitle title="Symptoms" />
      <Card>
        <KeyValue label="Pain episodes" value={`${a.pain_episodes.total} total · ${val(a.pain_episodes.per_visit_avg)} per visit`} />
        <KeyValue label="Transfusions reported" value={String(a.transfusions_reported)} />
        {chart('pain_episodes', 'Pain episodes', 'episodes')}
      </Card>

      <Text style={[ui.muted, { textAlign: 'center' }]}
        onPress={() => router.push({ pathname: '/patients/[id]/history', params: { id } })}>
        {p.latest_visit ? `Latest visit ${formatDate(p.latest_visit.lab_sample_date)} · ` : ''}
        <Text style={{ color: C.primaryDark, fontFamily: Fonts.bodySemiBold }}>See full history</Text>
      </Text>
    </Screen>
  );
}

function TrendChart({ trends, loading, error, onRetry, lab, title, unit }: {
  trends: TrendsResponse | undefined; loading: boolean; error: string | null; onRetry: () => void;
  lab: string; title: string; unit?: string;
}) {
  if (loading && !trends) return <Loading />;
  if (error && !trends) return <ErrorState message={error} onRetry={onRetry} />;
  return (
    <View style={{ gap: 4, marginTop: 4 }}>
      <Text style={st.chartTitle}>{title}{unit ? ` (${unit})` : ''}</Text>
      <LineChart points={trends?.series[lab] ?? []} referenceLines={trends?.reference_lines[lab] ?? []}
        events={lab === 'hgb' || lab === 'dose_mg_per_kg' ? trends?.events ?? [] : []} unit={unit} title={title} height={160} />
    </View>
  );
}

function Tile({ label, value, unit, sub, tone }: { label: string; value: string; unit?: string; sub?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? C.primaryDark : tone === 'warn' ? C.warn : tone === 'bad' ? C.danger : C.text;
  return (
    <View style={st.tile} accessible accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}${sub ? `, ${sub}` : ''}`}>
      <Text style={st.tileLabel}>{label}</Text>
      <Text style={[st.tileValue, { color }]}>{value}{unit ? <Text style={st.tileUnit}> {unit}</Text> : null}</Text>
      {sub ? <Text style={st.tileSub}>{sub}</Text> : null}
    </View>
  );
}

function Bar({ fraction, color, label }: { fraction: number; color: string; label: string }) {
  return (
    <View style={{ gap: 4 }} accessible accessibilityLabel={label}>
      <View style={st.track}><View style={[st.fill, { width: `${Math.round(fraction * 100)}%`, backgroundColor: color }]} /></View>
      <Text style={ui.muted}>{label}</Text>
    </View>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <View style={ui.row}>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
      <Text style={ui.muted}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '45%', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, gap: 2 },
  tileLabel: { fontFamily: Fonts.bodySemiBold, fontSize: 12, color: C.muted },
  tileValue: { fontFamily: Fonts.headingBold, fontSize: 26 },
  tileUnit: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: C.muted },
  tileSub: { fontFamily: Fonts.body, fontSize: 12, color: C.muted },
  track: { height: 10, borderRadius: 5, backgroundColor: C.line, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: C.line },
  chartTitle: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: C.text },
});
