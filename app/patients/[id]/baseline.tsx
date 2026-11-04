import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Banner, Button, Card, DateField, ErrorState, Loading, Screen, SectionTitle, Segmented, TextField, ui } from '@/components/ui';
import { baselineChangeText } from '@/components/VisitHistoryItem';
import { BASELINE_SOURCES } from '@/constants/clinical';
import { C } from '@/constants/theme';
import { useBaseline, useBaselineHistory, useSaveBaseline } from '@/hooks/api';
import { ApiError, errorMessage, fieldErrors } from '@/lib/api/api-error';
import type { Baseline, BaselineSource } from '@/lib/api/types';
import { formatDate, fromIsoDate, parseNumber, toIsoDate } from '@/lib/clinical';

function daysSince(iso: string): number {
  return Math.round((fromIsoDate(toIsoDate(new Date())).getTime() - fromIsoDate(iso).getTime()) / 86_400_000);
}

export default function BaselineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const baseline = useBaseline(id);
  const notFound = baseline.error instanceof ApiError && baseline.error.status === 404;

  const title = <Stack.Screen options={{ title: baseline.data ? 'Update HU baseline' : 'Set HU baseline' }} />;
  if (baseline.isLoading) return <>{title}<Loading /></>;
  if (baseline.isError && !notFound) {
    return <>{title}<ErrorState message={errorMessage(baseline.error)} onRetry={() => baseline.refetch()} /></>;
  }
  return <>{title}<BaselineForm patientId={id} existing={baseline.data ?? null} /></>;
}

function BaselineForm({ patientId, existing }: { patientId: string; existing: Baseline | null }) {
  const save = useSaveBaseline(patientId);
  const history = useBaselineHistory(patientId);
  const [hgb, setHgb] = useState(existing ? String(existing.baseline_hgb) : '');
  const [source, setSource] = useState<BaselineSource | null>(existing?.baseline_source ?? null);
  const [start, setStart] = useState<string | null>(existing?.hu_start_date ?? null);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const n = parseNumber(hgb);
    const e: Record<string, string> = {};
    if (n === null || Number.isNaN(n)) e.baseline_hgb = 'Enter baseline Hb as a number.';
    else if (n < 3 || n > 15) e.baseline_hgb = 'Baseline Hb must be between 3 and 15 g/dL.';
    if (!source) e.baseline_source = 'Select where this baseline came from.';
    if (!start) e.hu_start_date = 'Select the HU start date.';
    if (existing && !reason.trim()) e.reason = 'Give a reason for changing the baseline.';
    setErrors(e);
    if (Object.keys(e).length) return;

    const send = () => save.mutate(
      { baseline_hgb: n!, baseline_source: source!, hu_start_date: start!, ...(existing ? { reason: reason.trim() } : {}) },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          const fe = fieldErrors(err);
          setErrors(fe);
          if (Object.keys(fe).length === 0) Alert.alert('Could not save baseline', errorMessage(err));
        },
      },
    );
    if (!existing) return send();
    Alert.alert('Update baseline?', 'This creates a new baseline version. Existing predictions for this patient will be marked outdated.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Update', onPress: send },
    ]);
  };

  return (
    <Screen footer={<Button title={existing ? 'Update baseline' : 'Save baseline'} onPress={submit} loading={save.isPending} />}>
      <Card>
        <TextField
          label="Baseline Hb"
          unit="g/dL"
          value={hgb}
          onChangeText={setHgb}
          keyboardType="decimal-pad"
          error={errors.baseline_hgb}
          hint="Steady-state Hb before HU — not during a crisis or within 3 months of a transfusion."
        />
        <Segmented label="Source" value={source} onChange={setSource} error={errors.baseline_source}
          options={BASELINE_SOURCES.map(({ value, label }) => ({ value, label }))} />
        {source ? <Text style={ui.muted}>{BASELINE_SOURCES.find((b) => b.value === source)?.hint}</Text> : null}
        <DateField label="HU start date" value={start} onChange={setStart} error={errors.hu_start_date} />
        {start ? <Text style={ui.bodyBold}>Day {daysSince(start)} on HU</Text> : null}
        {existing ? (
          <TextField label="Reason for change" value={reason} onChangeText={setReason} error={errors.reason}
            placeholder="e.g. correct value found in folder" />
        ) : null}
      </Card>
      {existing ? <Banner tone="warn" text="Changing the baseline marks this patient's existing predictions as outdated." /> : null}

      <SectionTitle title="Version history" />
      {history.isLoading ? <Loading /> : history.isError ? (
        <ErrorState message={errorMessage(history.error)} onRetry={() => history.refetch()} />
      ) : (history.data ?? []).length === 0 ? (
        <Text style={ui.muted}>No earlier versions.</Text>
      ) : (
        <Card>
          {history.data!.map((ver, i, all) => (
            <View key={ver.version_id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 } : undefined}>
              <Text style={ui.bodyBold}>{formatDate(ver.changed_at)}</Text>
              <Text style={ui.body}>{baselineChangeText(ver, all[i + 1])}</Text>
              <Text style={ui.muted}>HU start {formatDate(ver.hu_start_date)}</Text>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
