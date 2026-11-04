import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AckFlag, FlagAckModal } from '@/components/FlagAckModal';
import {
  Banner, Button, Card, EmptyState, ErrorState, KeyValue, Loading, Screen, SectionTitle, SeverityBadge, ui,
} from '@/components/ui';
import {
  ADHERENCE, classLabel, FLAG_ACTIONS, LAB_FIELDS, PREGNANCY, SIDE_EFFECTS, YES_NO_UNKNOWN,
} from '@/constants/clinical';
import { C } from '@/constants/theme';
import { useConfig, usePatient, usePredictionEnabled, useVisit } from '@/hooks/api';
import { errorMessage } from '@/lib/api/api-error';
import type { PredictionRun } from '@/lib/api/types';
import { formatDate, formatDelta, roundTo5Percent } from '@/lib/clinical';

const label = <T extends string>(opts: { value: T; label: string }[], v: T | null | undefined) =>
  opts.find((o) => o.value === v)?.label ?? '—';

export default function VisitDetailScreen() {
  const { id, justSaved } = useLocalSearchParams<{ id: string; justSaved?: string }>();
  const visit = useVisit(id);
  const patient = usePatient(visit.data?.patient_id);
  const config = useConfig();
  const predictionEnabled = usePredictionEnabled();
  const [ackFlag, setAckFlag] = useState<AckFlag | null>(null);
  const autoOpened = useRef(false);

  // Spec F3 step 5: after saving, a critical flag opens the acknowledge sheet first.
  useEffect(() => {
    if (justSaved !== '1' || autoOpened.current || !visit.data) return;
    autoOpened.current = true;
    const critical = visit.data.flags.find((f) => f.severity === 'critical' && !f.acknowledged);
    if (critical) setAckFlag(critical);
  }, [justSaved, visit.data]);

  if (visit.isLoading) return <Loading />;
  if (visit.isError || !visit.data) return <ErrorState message={errorMessage(visit.error)} onRetry={visit.refetch} />;
  const v = visit.data;
  const unit = (k: (typeof LAB_FIELDS)[number]['key']) => config.data?.lab_ranges?.[k]?.unit ?? '';
  const side = SIDE_EFFECTS.filter((s) => v[s.key]).map((s) => s.label);
  const p = patient.data;

  return (
    <Screen refreshing={visit.isRefetching} onRefresh={visit.refetch}>
      <Stack.Screen options={{ title: `Visit ${formatDate(v.lab_sample_date)}` }} />
      {justSaved === '1' ? <Banner tone="success" text="Visit saved." /> : null}

      {p ? (
        <Pressable onPress={() => router.push({ pathname: '/patients/[id]', params: { id: p.id } })} accessibilityRole="link"
          accessibilityLabel={`Open patient ${p.full_name}`} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={ui.h2}>{p.full_name}</Text>
          <Text style={ui.muted}>Folder {p.folder_number} · tap to open profile</Text>
        </Pressable>
      ) : null}

      <SectionTitle title="Safety flags" />
      {v.flags.length === 0 ? (
        <Card><Text style={ui.muted}>No safety flags on this visit.</Text></Card>
      ) : v.flags.map((f) => (
        <Card key={f.id}>
          <View style={ui.row}>
            <SeverityBadge severity={f.severity} />
            <Text style={ui.muted}>
              {f.status === 'resolved_by_edit' ? 'Resolved by edit' : f.acknowledged ? `Acknowledged · ${label(FLAG_ACTIONS, f.action)}` : 'Not acknowledged'}
            </Text>
          </View>
          <Text style={ui.body}>{f.message}</Text>
          {!f.acknowledged && f.status !== 'resolved_by_edit' ? (
            <Button title="Acknowledge" variant="secondary" onPress={() => setAckFlag(f)} />
          ) : null}
        </Card>
      ))}

      <SectionTitle title="Labs" />
      <Card>
        <KeyValue label="Lab sample date" value={formatDate(v.lab_sample_date)} />
        {v.consult_date ? <KeyValue label="Consult date" value={formatDate(v.consult_date)} /> : null}
        <View style={ui.divider} />
        {LAB_FIELDS.map(({ key, label: l }) => {
          const val = v[key];
          const d = v.deltas?.[key];
          return (
            <KeyValue key={key} label={l} value={val == null ? '—' : `${val} ${unit(key)}${d != null ? `  (${d > 0 ? '↑' : d < 0 ? '↓' : '='} ${formatDelta(d)})` : ''}`} />
          );
        })}
        <Text style={ui.muted}>Changes are vs the previous visit.</Text>
      </Card>

      <SectionTitle title="Observed response" />
      <Card>
        {v.observed_response?.delta_hgb != null ? (
          <Text style={ui.body}>
            Hb {formatDelta(v.observed_response.delta_hgb)} g/dL vs baseline
            {v.observed_response.meets_criterion ? ' · meets ≥ 1.0 criterion' : ' · below ≥ 1.0 criterion'}
          </Text>
        ) : <Text style={ui.muted}>Not available (no baseline or not assessable).</Text>}
      </Card>

      <SectionTitle title="Treatment" />
      <Card>
        <KeyValue label="Weight" value={v.weight_kg != null ? `${v.weight_kg} kg` : '—'} />
        <KeyValue label="HU dose" value={v.dose_mg != null ? `${v.dose_mg} mg${v.dose_mg_per_kg != null ? ` (${v.dose_mg_per_kg} mg/kg)` : ''}` : '—'} />
        <KeyValue label="Adherence" value={label(ADHERENCE, v.adherence)} />
        <KeyValue label="Transfused in last 3 months" value={label(YES_NO_UNKNOWN, v.transfused_last_3_months)} />
        {v.pregnancy_status ? <KeyValue label="Pregnancy status" value={label(PREGNANCY, v.pregnancy_status)} /> : null}
        {v.pregnancy_status ? <KeyValue label="Contraception counselled" value={v.contraception_counselled ? 'Yes' : 'No'} /> : null}
        <KeyValue label="Side effects" value={side.length ? side.join(', ') : 'None'} />
        <KeyValue label="Pain episodes" value={v.pain_episodes != null ? String(v.pain_episodes) : '—'} />
        <KeyValue label="Next appointment" value={formatDate(v.next_appointment_date)} />
        {v.note ? <><View style={ui.divider} /><Text style={ui.body}>{v.note}</Text></> : null}
        <View style={ui.divider} />
        <Text style={ui.muted}>Recorded by {v.created_by?.full_name ?? 'unknown'} · {formatDate(v.created_at)}</Text>
      </Card>
      <Button title="Edit visit" variant="secondary" icon="create-outline"
        onPress={() => router.push({ pathname: '/visits/[id]/edit', params: { id: v.id } })} />

      {predictionEnabled ? (
        <>
          <SectionTitle title="Prediction (research aid)" action="History"
            onAction={() => router.push({ pathname: '/patients/[id]/predictions', params: { id: v.patient_id } })} />
          <Card>
            {v.prediction ? (
              <>
                <PredictionSummary run={v.prediction} defaultModel={config.data?.prediction_models?.find((m) => m.is_default)?.id} />
                <Button title="Open prediction" onPress={() => router.push({ pathname: '/visits/[id]/predict', params: { id: v.id } })} />
              </>
            ) : (
              <>
                <Button title="Request prediction (research aid)" variant="secondary" icon="analytics-outline"
                  onPress={() => router.push({ pathname: '/visits/[id]/predict', params: { id: v.id } })} />
                <Text style={ui.muted}>The visit is saved either way. If the model service is down, you can try later.</Text>
              </>
            )}
          </Card>
        </>
      ) : null}

      <FlagAckModal flag={ackFlag} onClose={() => setAckFlag(null)} />
    </Screen>
  );
}

function PredictionSummary({ run, defaultModel }: { run: PredictionRun; defaultModel?: string }) {
  const r = run.results.find((x) => x.model === defaultModel && !x.error) ?? run.results.find((x) => !x.error);
  return (
    <View style={{ gap: 6 }}>
      {run.status === 'outdated' ? <Banner tone="warn" text="Prediction outdated — re-run." /> : null}
      {r && !r.error ? (
        <Text style={ui.body}>
          <Text style={ui.bodyBold}>{r.model_name}</Text> · Hb rise ≥ 1 g/dL: <Text style={ui.bodyBold}>{classLabel(r.predicted_class)}</Text> ({roundTo5Percent(r.response_probability)}%)
        </Text>
      ) : <EmptyState title="No model result" body="All models failed on this run. Open to retry." />}
      {run.agreement.of > 1 ? (
        <Text style={[ui.muted, !run.agreement.all_agree && { color: C.warn }]}>
          {run.agreement.all_agree ? `All ${run.agreement.of} models agree` : `Models disagree: ${run.agreement.responder_votes} of ${run.agreement.of} likely`}
        </Text>
      ) : null}
    </View>
  );
}
