// One row of a patient's history (GET /patients/{id}/visits/). Tap opens the visit.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SeverityBadge, ui } from '@/components/ui';
import { BASELINE_SOURCES, classLabel, FLAG_ACTIONS } from '@/constants/clinical';
import { C, Fonts } from '@/constants/theme';
import { usePredictionEnabled } from '@/hooks/api';
import type { BaselineVersion, VisitHistoryRow } from '@/lib/api/types';
import { formatDate, formatDelta, roundTo5Percent } from '@/lib/clinical';

const v = (n: number | null | undefined, unit = '') => (n === null || n === undefined ? '—' : `${n}${unit}`);

export function VisitHistoryItem({ row }: { row: VisitHistoryRow }) {
  const predictionOn = usePredictionEnabled();
  const p = row.prediction;
  const dose = row.dose_mg === null ? 'Dose —' : `Dose ${row.dose_mg} mg${row.dose_mg_per_kg !== null ? ` (${row.dose_mg_per_kg} mg/kg)` : ''}`;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/visits/[id]', params: { id: row.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Visit on ${formatDate(row.lab_sample_date)}, Hb ${v(row.hgb)}`}
      style={({ pressed }) => [st.card, pressed && { opacity: 0.8 }]}
    >
      <View style={ui.row}>
        <Text style={[ui.bodyBold, { flex: 1 }]}>{formatDate(row.lab_sample_date)}</Text>
        {row.edited ? <Tag text="edited" /> : null}
        {row.transfused_last_3_months === 'yes' ? <Tag text="transfused" tone="danger" /> : null}
        {row.transfused_last_3_months === 'unknown' ? <Tag text="transfusion unknown" /> : null}
        <Ionicons name="chevron-forward" size={18} color={C.faint} />
      </View>

      <Text style={ui.body}>
        Hb <Text style={ui.bodyBold}>{v(row.hgb, ' g/dL')}</Text>
        <Text style={ui.muted}>  {formatDelta(row.delta_hgb_vs_previous)} vs prev · {formatDelta(row.delta_hgb_vs_baseline)} vs baseline</Text>
      </Text>
      <Text style={ui.muted}>ANC {v(row.anc)} · Platelets {v(row.platelet_count)}</Text>
      <Text style={ui.muted}>
        {dose}
        {row.dose_changed ? ` · dose changed ${v(row.previous_dose_mg)}→${v(row.dose_mg)} mg` : ''}
      </Text>
      <Text style={ui.muted}>
        Adherence {row.adherence ?? '—'} · Pain episodes {v(row.pain_episodes)}
      </Text>

      {row.flags.map((f, i) => (
        <View key={f.id ?? i} style={ui.row}>
          <SeverityBadge severity={f.severity} />
          <Text style={[ui.muted, { flex: 1, color: C.text }]}>
            {f.message || f.rule}
            {f.status === 'resolved_by_edit' ? ' · resolved by edit'
              : f.acknowledged ? ` · acknowledged${f.action ? `: ${FLAG_ACTIONS.find((a) => a.value === f.action)?.label ?? f.action}` : ''}` : ''}
          </Text>
        </View>
      ))}

      {predictionOn && p ? (
        <Text style={ui.muted}>
          Prediction: Hb rise {classLabel(p.predicted_class)} ({roundTo5Percent(p.response_probability)}%)
          {p.status === 'outdated' ? ' · outdated' : ''}
          {' · '}{p.outcome ? `outcome ${p.outcome.replace(/_/g, ' ')}` : 'outcome pending'}
        </Text>
      ) : null}

      {row.created_by ? <Text style={[ui.muted, { fontSize: 12 }]}>by {row.created_by.full_name}</Text> : null}
    </Pressable>
  );
}

const sourceLabel = (s: string) => BASELINE_SOURCES.find((b) => b.value === s)?.label.toLowerCase() ?? s;

/** "Baseline updated 7.2 → 7.0 g/dL (from folder) · reason · by X". `previous` = the older version. */
export function baselineChangeText(v: BaselineVersion, previous?: BaselineVersion): string {
  const what = previous
    ? `Baseline updated ${previous.baseline_hgb} → ${v.baseline_hgb} g/dL`
    : `Baseline set ${v.baseline_hgb} g/dL`;
  return [`${what} (${sourceLabel(v.baseline_source)})`, v.reason, v.changed_by ? `by ${v.changed_by.full_name}` : null]
    .filter(Boolean).join(' · ');
}

function Tag({ text, tone }: { text: string; tone?: 'danger' }) {
  return (
    <View style={[st.tag, tone === 'danger' && { backgroundColor: C.dangerSoft }]}>
      <Text style={[st.tagText, tone === 'danger' && { color: C.danger }]}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.line, gap: 6, minHeight: 44 },
  tag: { backgroundColor: '#eef2f1', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontFamily: Fonts.bodySemiBold, fontSize: 11, color: C.muted },
});
