import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, EmptyState, ErrorState, Loading, Screen, ui } from '@/components/ui';
import { classLabel, PREDICTION_DISCLAIMER } from '@/constants/clinical';
import { C, Fonts } from '@/constants/theme';
import { useConfig, useMe, usePredictionEnabled, usePredictions } from '@/hooks/api';
import { errorMessage } from '@/lib/api/api-error';
import type { ModelResult, PredictionRun } from '@/lib/api/types';
import { formatDate, formatDelta, roundTo5Percent } from '@/lib/clinical';

export default function PredictionHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const enabled = usePredictionEnabled();
  const list = usePredictions(enabled ? id : undefined);
  const defaultModel = useConfig().data?.prediction_models?.find((m) => m.is_default)?.id;
  const title = <Stack.Screen options={{ title: 'Prediction history' }} />;

  if (me.isLoading) return <Loading />;
  if (!enabled) return <Screen>{title}<EmptyState icon="lock-closed-outline" title="Prediction isn't enabled for your facility" /></Screen>;
  if (list.isLoading) return <Loading />;
  if (list.isError) return <ErrorState message={errorMessage(list.error)} onRetry={list.refetch} />;
  const runs = list.data?.results ?? [];

  return (
    <Screen refreshing={list.isRefetching} onRefresh={list.refetch}>
      {title}
      {runs.length === 0 ? <EmptyState icon="analytics-outline" title="No predictions yet" body="Request one from the patient's latest visit." /> : null}
      {runs.map((r) => <RunCard key={r.run_id} run={r} defaultModel={defaultModel} />)}
      {runs.length ? <Text style={ui.muted}>{PREDICTION_DISCLAIMER}</Text> : null}
    </Screen>
  );
}

function resultLine(r: ModelResult) {
  return r.error ? `${r.model_name}: unavailable` : `${r.model_name}: ${classLabel(r.predicted_class)} · ${roundTo5Percent(r.response_probability)}%`;
}

function RunCard({ run, defaultModel }: { run: PredictionRun; defaultModel?: string }) {
  const [open, setOpen] = useState(false);
  const main = run.results.find((r) => r.model === defaultModel) ?? run.results[0];
  const o = run.observed_outcome;
  return (
    <Card>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.bodyBold}>{formatDate(run.created_at)}</Text>
        <Text style={[ui.muted, run.status === 'outdated' && { color: C.warn }]}>{run.status === 'outdated' ? 'Outdated' : 'Current'}</Text>
      </View>
      {main ? <Text style={ui.body}>{resultLine(main)}</Text> : null}
      <Text style={ui.muted}>
        {!o ? 'Outcome: waiting for next visit'
          : !o.assessable ? 'Next visit — not assessable'
          : `Next visit Hb ${formatDelta(o.delta_hgb)} — criterion ${o.meets_criterion ? 'met' : 'not met'}`}
      </Text>
      {open ? run.results.map((r) => (
        <View key={r.model} style={ui.row}>
          <Text style={[ui.body, { flex: 1 }]}>{resultLine(r)}</Text>
          {!r.error && r.correct != null ? (
            <Ionicons name={r.correct ? 'checkmark-circle' : 'close-circle'} size={20} color={r.correct ? C.primaryDark : C.danger}
              accessibilityLabel={r.correct ? 'Correct' : 'Incorrect'} />
          ) : null}
        </View>
      )) : null}
      <View style={ui.row}>
        <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', flex: 1 }}>
          <Text style={{ color: C.primaryDark, fontFamily: Fonts.bodySemiBold, fontSize: 14 }}>{open ? 'Hide models' : `Show all ${run.results.length} models`}</Text>
        </Pressable>
        <Button title="Open visit" variant="ghost" onPress={() => router.push({ pathname: '/visits/[id]', params: { id: run.visit_id } })} />
      </View>
    </Card>
  );
}
