// Patient profile hub (spec §8, US2.3).
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { LineChart } from '@/components/LineChart';
import {
  Button, Card, EmptyState, ErrorState, KeyValue, Loading, Screen, SectionTitle, Segmented, SeverityBadge, ui,
} from '@/components/ui';
import { VisitHistoryItem } from '@/components/VisitHistoryItem';
import { BASELINE_SOURCES, classLabel, GENOTYPES } from '@/constants/clinical';
import { C } from '@/constants/theme';
import { useConfig, usePatient, usePredictionEnabled, useTrends, useVisits } from '@/hooks/api';
import { ApiError, errorMessage } from '@/lib/api/api-error';
import type { ModelResult, PatientDetail, PredictedClass } from '@/lib/api/types';
import { formatDate, formatDelta, roundTo5Percent } from '@/lib/clinical';

type Period = '6m' | '12m' | 'all';
type OkResult = Extract<ModelResult, { predicted_class: PredictedClass }>;
const val = (n: number | null | undefined, unit = '') => (n === null || n === undefined ? '—' : `${n}${unit}`);

export default function PatientProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const patient = usePatient(id);
  const visits = useVisits(id, 5);
  const trends = useTrends(id, ['hgb']);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([patient.refetch(), visits.refetch(), trends.refetch()]);
    setRefreshing(false);
  };

  if (patient.isLoading) return <><Stack.Screen options={{ title: 'Patient' }} /><Loading /></>;
  if (patient.error instanceof ApiError && patient.error.status === 404) {
    return <><Stack.Screen options={{ title: 'Patient' }} /><EmptyState icon="person-outline" title="Patient not found" body="It may belong to another facility or have been removed." /></>;
  }
  if (!patient.data) {
    return <><Stack.Screen options={{ title: 'Patient' }} /><ErrorState message={errorMessage(patient.error)} onRetry={() => patient.refetch()} /></>;
  }

  const p = patient.data;
  const go = {
    edit: () => router.push({ pathname: '/patients/[id]/edit', params: { id } }),
    baseline: () => router.push({ pathname: '/patients/[id]/baseline', params: { id } }),
    newVisit: () => router.push({ pathname: '/patients/[id]/new-visit', params: { id } }),
    history: () => router.push({ pathname: '/patients/[id]/history', params: { id } }),
    trends: () => router.push({ pathname: '/patients/[id]/trends', params: { id } }),
  };
  const genotype = GENOTYPES.find((g) => g.value === p.genotype)?.label ?? p.genotype;
  const obs = p.observed_response;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} footer={<Button title="New visit" icon="add" onPress={go.newVisit} />}>
      <Stack.Screen options={{ title: p.full_name }} />

      <Card>
        <Text style={ui.h1}>{p.full_name}</Text>
        <Text style={ui.muted}>Folder {p.folder_number}</Text>
        <Text style={ui.body}>{p.age_years} y · {p.sex === 'male' ? 'Male' : 'Female'} · {genotype}</Text>
        <Text style={ui.body}>{p.hu ? `Day ${p.hu.days_on_hu} on HU` : 'No baseline'}</Text>
        <Text style={ui.muted}>Primary clinician: {p.primary_clinician?.full_name ?? 'not set'}</Text>
        {p.next_appointment_date ? (
          <Text style={[ui.muted, p.overdue && { color: C.danger }]}>
            Next appointment {formatDate(p.next_appointment_date)}{p.overdue ? ' · overdue' : ''}
          </Text>
        ) : null}
        <Button title="Edit" variant="secondary" icon="create-outline" onPress={go.edit} />
      </Card>

      {p.active_flags.length ? (
        <>
          <SectionTitle title="Active flags" action={p.latest_visit ? 'Open latest visit' : undefined}
            onAction={p.latest_visit ? () => router.push({ pathname: '/visits/[id]', params: { id: p.latest_visit!.id } }) : undefined} />
          <Card>
            {p.active_flags.map((f) => (
              <View key={f.id} style={ui.row}>
                <SeverityBadge severity={f.severity} />
                <Text style={[ui.body, { flex: 1 }]}>{f.message}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {!p.hu ? (
        <Card>
          <EmptyState icon="flask-outline" title="No HU baseline yet" body="Set the steady-state Hb and HU start date to track response."
            action="Set HU baseline" onAction={go.baseline} />
        </Card>
      ) : null}
      {!p.latest_visit ? (
        <Card>
          <EmptyState icon="clipboard-outline" title="No visits yet" action="Record first visit" onAction={go.newVisit} />
        </Card>
      ) : null}

      {p.hu && p.latest_visit ? (
        <Card>
          <SectionTitle title="Observed response" />
          <Text style={ui.body}>
            {obs && obs.delta_hgb !== null
              ? `Hb ${formatDelta(obs.delta_hgb)} g/dL vs baseline · ${obs.meets_criterion === true ? 'meets criterion' : obs.meets_criterion === false ? 'does not meet criterion (+1.0)' : 'not assessable'}`
              : 'Not assessable for the latest visit'}
          </Text>
        </Card>
      ) : null}

      {p.hu ? (
        <>
          <SectionTitle title="HU treatment" action="Update baseline" onAction={go.baseline} />
          <Card>
            <KeyValue label="Baseline Hb" value={`${p.hu.baseline_hgb} g/dL`} />
            <KeyValue label="Source" value={BASELINE_SOURCES.find((b) => b.value === p.hu!.baseline_source)?.label ?? p.hu.baseline_source} />
            <KeyValue label="HU start" value={formatDate(p.hu.hu_start_date)} />
            <KeyValue label="Days on HU" value={String(p.hu.days_on_hu)} />
            <KeyValue label="Current dose"
              value={p.analytics.dose.current_mg === null ? '—' : `${p.analytics.dose.current_mg} mg${p.analytics.dose.current_mg_per_kg !== null ? ` · ${p.analytics.dose.current_mg_per_kg} mg/kg` : ''}`} />
          </Card>
        </>
      ) : null}

      <LatestPrediction p={p} />

      <SectionTitle title="Hb trend" action="All trends" onAction={go.trends} />
      <Card>
        {trends.isLoading ? <Loading /> : trends.isError ? (
          <ErrorState message={errorMessage(trends.error)} onRetry={() => trends.refetch()} />
        ) : (
          <LineChart points={trends.data?.series.hgb ?? []} referenceLines={trends.data?.reference_lines.hgb ?? []}
            events={trends.data?.events ?? []} unit="g/dL" title="Hb" />
        )}
      </Card>

      <Analytics id={id} />

      <SectionTitle title="Recent history" action="See all" onAction={go.history} />
      {visits.isLoading ? <Loading /> : visits.isError ? (
        <ErrorState message={errorMessage(visits.error)} onRetry={() => visits.refetch()} />
      ) : visits.data?.results.length ? (
        <View style={ui.gap}>{visits.data.results.slice(0, 5).map((row) => <VisitHistoryItem key={row.id} row={row} />)}</View>
      ) : <Text style={ui.muted}>No visits recorded.</Text>}
    </Screen>
  );
}

function LatestPrediction({ p }: { p: PatientDetail }) {
  const enabled = usePredictionEnabled();
  const config = useConfig();
  if (!enabled) return null;

  const run = p.latest_prediction;
  const ok = (run?.results ?? []).filter((r): r is OkResult => !r.error);
  const defaultId = config.data?.prediction_models.find((m) => m.is_default)?.id;
  const result = ok.find((r) => r.model === defaultId) ?? ok[0];
  const blocked = p.prediction_eligibility && !p.prediction_eligibility.eligible ? p.prediction_eligibility.reasons[0]?.message : null;

  return (
    <>
      <SectionTitle title="Latest prediction" action="Prediction history"
        onAction={() => router.push({ pathname: '/patients/[id]/predictions', params: { id: p.id } })} />
      <Card>
        {run && result ? (
          <Pressable
            onPress={() => router.push({ pathname: '/visits/[id]/predict', params: { id: run.visit_id } })}
            accessibilityRole="button"
            accessibilityLabel="Open latest prediction"
            style={{ gap: 6, minHeight: 44 }}
          >
            <View style={ui.row}>
              <Text style={[ui.bodyBold, { flex: 1 }]}>Hb rise ≥1 g/dL at next visit: {classLabel(result.predicted_class)}</Text>
              {run.status === 'outdated' ? (
                <Text style={{ backgroundColor: C.warnSoft, color: C.warn, paddingHorizontal: 6, borderRadius: 6, fontSize: 11 }}>OUTDATED</Text>
              ) : null}
            </View>
            <Text style={ui.muted}>
              {result.model_name} · {roundTo5Percent(result.response_probability)}% · {formatDate(run.created_at)}
            </Text>
            <Text style={[ui.muted, { color: C.primaryDark }]}>Open</Text>
          </Pressable>
        ) : <Text style={ui.muted}>No prediction yet.</Text>}
        {blocked ? <Text style={ui.muted}>{blocked}</Text> : null}
      </Card>
    </>
  );
}

function Analytics({ id }: { id: string }) {
  const [period, setPeriod] = useState<Period>('all');
  const q = usePatient(id, period);
  const a = q.data?.analytics;
  return (
    <>
      <SectionTitle title="Analytics" />
      <Card>
        <Segmented value={period} onChange={setPeriod}
          options={[{ value: '6m', label: '6 months' }, { value: '12m', label: '12 months' }, { value: 'all', label: 'All' }]} />
        {q.isLoading ? <Loading /> : !a ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : (
          <>
            <KeyValue label="Visits" value={String(a.visit_count)} />
            <KeyValue label="Hb min / mean / max" value={`${val(a.hgb.min)} / ${val(a.hgb.mean)} / ${val(a.hgb.max)} g/dL`} />
            <KeyValue label="Visits meeting criterion" value={`${a.hgb.visits_meeting_criterion} of ${a.hgb.visits_assessed} assessed`} />
            <KeyValue label="MCV change" value={a.mcv.change === null ? '—' : `${formatDelta(a.mcv.change, 0)} fL (${val(a.mcv.first)} → ${val(a.mcv.latest)})`} />
            <KeyValue label="Dose changes" value={String(a.dose.changes)} />
            <KeyValue label="Adherence good / partial / poor" value={`${a.adherence.good} / ${a.adherence.partial} / ${a.adherence.poor}`} />
            <KeyValue label="Flags (critical)" value={`${a.toxicity.flags_total} (${a.toxicity.critical})`} />
            <KeyValue label="Pain episodes" value={`${a.pain_episodes.total} · ${val(a.pain_episodes.per_visit_avg)} per visit`} />
            <KeyValue label="Transfusions reported" value={String(a.transfusions_reported)} />
          </>
        )}
      </Card>
    </>
  );
}
