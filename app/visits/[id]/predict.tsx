// Multi-model prediction (multi-model-prediction.md v2). The server always runs every model; the toggle is display-only.
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Banner, Button, Card, EmptyState, ErrorState, Loading, Screen, Segmented, SectionTitle, SeverityBadge, TextPromptModal, ui,
} from '@/components/ui';
import { classLabel, PREDICTION_DISCLAIMER, RELIABILITY_TEXT } from '@/constants/clinical';
import { C, Fonts } from '@/constants/theme';
import { useConfig, useEligibility, useMe, usePredict, usePredictionEnabled, useVisit } from '@/hooks/api';
import { ApiError, errorMessage, isApiCode } from '@/lib/api/api-error';
import type { EligibilityReason, ModelResult, PredictionModelInfo, PredictionRun } from '@/lib/api/types';
import { formatDate, formatDelta, roundTo5Percent } from '@/lib/clinical';

const COMPARE = '__compare';

export default function PredictScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const enabled = usePredictionEnabled();
  const visit = useVisit(id);
  const elig = useEligibility(id, enabled);
  const config = useConfig();
  const predict = usePredict(id, visit.data?.patient_id ?? '');
  const [view, setView] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState<string | undefined>();

  const title = <Stack.Screen options={{ title: 'Prediction' }} />;
  const notEnabled = (
    <Screen>{title}<EmptyState icon="lock-closed-outline" title="Prediction isn't enabled for your facility" /></Screen>
  );
  if (me.isLoading || visit.isLoading || config.isLoading) return <Loading />;
  if (!enabled || isApiCode(predict.error, 'prediction_disabled')) return notEnabled;
  if (visit.isError || !visit.data) return <ErrorState message={errorMessage(visit.error)} onRetry={visit.refetch} />;

  const v = visit.data;
  const models = config.data?.prediction_models ?? [];
  const run: PredictionRun | null = predict.data ?? v.prediction;
  const current = view ?? models.find((m) => m.is_default)?.id ?? models[0]?.id ?? COMPARE;
  const e = elig.data;
  const onlyCoreLabs = !!e && !e.eligible && e.reasons.length > 0 && e.reasons.every((r) => r.code === 'core_labs_missing');

  const request = (reason?: string) => {
    setOverrideReason(reason);
    predict.mutateAsync(reason).catch(() => {}); // error is rendered from predict.error
  };
  const retry = () => request(overrideReason);

  const err = predict.error;
  const conflictReasons = err instanceof ApiError && err.status === 409
    ? ((err.data as { reasons?: EligibilityReason[] } | undefined)?.reasons ?? []) : null;
  const unavailable = isApiCode(err, 'prediction_unavailable') || (err instanceof ApiError && err.status === 503);

  const activeFlags = v.flags.filter((f) => f.status !== 'resolved_by_edit' && !f.acknowledged);
  const reliability = run?.reliability_note ?? e?.reliability_note;
  const imputed = run?.imputed_lab_count ?? e?.imputed_lab_count;
  const observed = run?.observed_response ?? v.observed_response;

  return (
    <Screen refreshing={elig.isRefetching} onRefresh={() => { elig.refetch(); visit.refetch(); }}>
      {title}
      <Text style={ui.muted}>Visit of {formatDate(v.lab_sample_date)}</Text>

      <SectionTitle title="Eligibility" />
      <Card>
        {elig.isLoading ? <Loading /> : elig.isError ? (
          <ErrorState message={errorMessage(elig.error)} onRetry={elig.refetch} />
        ) : e?.eligible ? (
          <Check ok text="Eligible for prediction" />
        ) : (
          e?.reasons.map((r) => <Check key={r.code} text={r.message} sub={r.eligible_from ? `Eligible from ${formatDate(r.eligible_from)}` : undefined} />)
        )}
      </Card>

      {conflictReasons ? (
        <Banner tone="warn" title="Not eligible" text={conflictReasons.map((r) => r.message).join('\n') || errorMessage(err)} />
      ) : unavailable ? (
        <Banner tone="danger" title="Prediction unavailable, try later" text="The visit is saved. Nothing was lost." />
      ) : err ? <Banner tone="danger" text={errorMessage(err)} /> : null}

      {run?.status === 'outdated' ? (
        <View style={{ gap: 8 }}>
          <Banner tone="warn" title="Prediction outdated — re-run" text="The visit, baseline or demographics changed after this run." />
          <Button title="Re-run prediction" icon="refresh" loading={predict.isPending} onPress={() => request(overrideReason)} />
        </View>
      ) : null}

      {!run ? (
        <>
          <Button title="Request prediction (research aid)" icon="analytics-outline" loading={predict.isPending}
            disabled={!!e && !e.eligible} onPress={() => request()} />
          {onlyCoreLabs ? (
            <Button title="Predict anyway" variant="secondary" disabled={predict.isPending} onPress={() => setOverrideOpen(true)} />
          ) : null}
        </>
      ) : (
        <Card>
          <Segmented
            options={[...models.map((m) => ({ value: m.id, label: m.name.replace('Regression', 'Reg') })), { value: COMPARE, label: 'Compare' }]}
            value={current}
            onChange={setView}
          />
          {current === COMPARE ? (
            <Compare run={run} onRetry={retry} retrying={predict.isPending} />
          ) : (
            <Single result={run.results.find((r) => r.model === current)} info={models.find((m) => m.id === current)}
              onRetry={retry} retrying={predict.isPending} />
          )}
        </Card>
      )}

      <Card>
        <Text style={ui.body}>
          Observed Hb change vs baseline: <Text style={ui.bodyBold}>{observed?.delta_hgb != null ? `${formatDelta(observed.delta_hgb)} g/dL` : '—'}</Text>
          {observed?.meets_criterion != null ? (observed.meets_criterion ? ' (meets criterion)' : ' (below criterion)') : ''}
        </Text>
        {imputed != null ? <Text style={ui.body}>{imputed} of 8 labs estimated</Text> : null}
        {reliability ? <Banner tone="warn" text={RELIABILITY_TEXT[reliability]} /> : null}
        {activeFlags.map((f) => (
          <View key={f.id} style={ui.row}><SeverityBadge severity={f.severity} /><Text style={[ui.body, { flex: 1 }]}>{f.message}</Text></View>
        ))}
      </Card>
      <Text style={st.disclaimer}>{PREDICTION_DISCLAIMER}</Text>

      <TextPromptModal
        visible={overrideOpen}
        title="Predict without core labs"
        message="ANC, platelets or WBC are missing and will be estimated. Give a reason (logged)."
        placeholder="e.g. Lab analyser down, FBC partial"
        confirmLabel="Predict anyway"
        onCancel={() => setOverrideOpen(false)}
        onSubmit={(reason) => { setOverrideOpen(false); request(reason); }}
      />
    </Screen>
  );
}

function Check({ ok, text, sub }: { ok?: boolean; text: string; sub?: string }) {
  return (
    <View style={[ui.row, { alignItems: 'flex-start' }]}>
      <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={20} color={ok ? C.primaryDark : C.danger} />
      <View style={{ flex: 1 }}>
        <Text style={ui.body}>{text}</Text>
        {sub ? <Text style={ui.muted}>{sub}</Text> : null}
      </View>
    </View>
  );
}

/** Probability bar with this model's own threshold marked (probabilities aren't comparable across models). */
function ThresholdBar({ probability, threshold }: { probability: number; threshold: number }) {
  const pct = roundTo5Percent(probability);
  return (
    <View accessible accessibilityLabel={`${pct}%, threshold ${Math.round(threshold * 100)}%`}>
      <View style={st.track}>
        <View style={[st.fill, { width: `${pct}%` }]} />
        <View style={[st.marker, { left: `${threshold * 100}%` }]} />
      </View>
      <Text style={ui.muted}>Threshold {Math.round(threshold * 100)}%</Text>
    </View>
  );
}

function Failed({ name, onRetry, retrying }: { name: string; onRetry: () => void; retrying: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.body}>{name} unavailable, try again later</Text>
      <Button title="Retry" variant="secondary" icon="refresh" loading={retrying} onPress={onRetry} />
    </View>
  );
}

function Single({ result, info, onRetry, retrying }: {
  result?: ModelResult; info?: PredictionModelInfo; onRetry: () => void; retrying: boolean;
}) {
  const metrics = info ? (
    <Text style={ui.muted}>Test AUC {info.test_metrics.auc.toFixed(2)} · catches {Math.round(info.test_metrics.sensitivity * 100)}% of responders</Text>
  ) : null;
  if (!result) return <>{metrics}<Text style={ui.muted}>No result for this model on this run.</Text></>;
  if (result.error) return <>{metrics}<Failed name={result.model_name} onRetry={onRetry} retrying={retrying} /></>;
  return (
    <View style={{ gap: 8 }}>
      {metrics}
      <Text style={ui.body}>
        <Text style={ui.bodyBold}>{result.model_name}</Text> · Hb rise ≥ 1 g/dL at next lab visit:{' '}
        <Text style={ui.bodyBold}>{classLabel(result.predicted_class)}</Text>
      </Text>
      <Text style={st.big}>{roundTo5Percent(result.response_probability)}%</Text>
      <ThresholdBar probability={result.response_probability} threshold={result.threshold} />
    </View>
  );
}

function Compare({ run, onRetry, retrying }: {
  run: PredictionRun; onRetry: () => void; retrying: boolean;
}) {
  const { responder_votes: yes, of, all_agree } = run.agreement;
  const failed = run.results.filter((r) => r.error).length;
  return (
    <View style={{ gap: 12 }}>
      {of > 0 ? (
        <Banner
          tone={all_agree ? 'info' : 'warn'}
          icon={all_agree ? 'git-merge-outline' : 'git-compare-outline'}
          text={(all_agree ? `All ${of} models: ${yes === of ? 'likely' : 'unlikely'}` : `Models disagree: ${yes} of ${of} likely`)
            + (failed ? ` (${failed} unavailable)` : '')}
        />
      ) : null}
      {run.results.map((r) => (
        <View key={r.model} style={st.row}>
          <Text style={ui.bodyBold}>{r.model_name}</Text>
          {r.error ? <Failed name={r.model_name} onRetry={onRetry} retrying={retrying} /> : (
            <>
              <Text style={ui.body}>{classLabel(r.predicted_class)} · {roundTo5Percent(r.response_probability)}%</Text>
              <ThresholdBar probability={r.response_probability} threshold={r.threshold} />
            </>
          )}
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  track: { height: 10, borderRadius: 5, backgroundColor: C.line, marginTop: 4, marginBottom: 4, overflow: 'visible' },
  fill: { height: 10, borderRadius: 5, backgroundColor: C.info },
  marker: { position: 'absolute', top: -4, width: 3, height: 18, marginLeft: -1.5, backgroundColor: C.text, borderRadius: 1 },
  big: { fontFamily: Fonts.headingBold, fontSize: 28, color: C.text },
  row: { gap: 4, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  disclaimer: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: C.muted, lineHeight: 19, textAlign: 'center' },
});
