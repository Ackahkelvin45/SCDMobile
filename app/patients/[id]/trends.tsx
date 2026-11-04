import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { LineChart } from '@/components/LineChart';
import { Card, Chip, ErrorState, Loading, Screen, ui } from '@/components/ui';
import { LAB_SHORT } from '@/constants/clinical';
import { C } from '@/constants/theme';
import { useConfig, useTrends } from '@/hooks/api';
import { errorMessage } from '@/lib/api/api-error';
import { formatDate } from '@/lib/clinical';

const LABS = ['hgb', 'anc', 'platelet_count', 'wbc', 'mcv', 'hct', 'arc', 'rbc', 'weight_kg', 'dose_mg_per_kg', 'pain_episodes'];
// Non-lab series aren't in /config/ lab_ranges.
const EXTRA_UNITS: Record<string, string> = { weight_kg: 'kg', dose_mg_per_kg: 'mg/kg', pain_episodes: '' };

export default function TrendsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lab, setLab] = useState('hgb');
  const trends = useTrends(id, [lab]);
  const config = useConfig();
  const ranges = config.data?.lab_ranges as Record<string, { unit: string } | undefined> | undefined;
  const unit = ranges?.[lab]?.unit ?? EXTRA_UNITS[lab];
  const points = trends.data?.series[lab] ?? [];

  return (
    <Screen refreshing={trends.isRefetching} onRefresh={() => trends.refetch()}>
      <Stack.Screen options={{ title: 'Trends' }} />
      <View style={ui.wrap}>
        {LABS.map((k) => <Chip key={k} label={LAB_SHORT[k] ?? k} selected={lab === k} onPress={() => setLab(k)} />)}
      </View>
      {trends.isLoading ? <Loading /> : trends.isError ? (
        <ErrorState message={errorMessage(trends.error)} onRetry={() => trends.refetch()} />
      ) : (
        <>
          <Card>
            <Text style={ui.h2}>{LAB_SHORT[lab] ?? lab}{unit ? ` (${unit})` : ''}</Text>
            <LineChart
              points={points}
              referenceLines={trends.data?.reference_lines[lab] ?? []}
              events={trends.data?.events ?? []}
              unit={unit || undefined}
              title={LAB_SHORT[lab]}
              height={220}
            />
          </Card>
          {points.length ? (
            <Card style={{ gap: 0 }}>
              {[...points].sort((a, b) => b.date.localeCompare(a.date)).map((p, i) => (
                <Pressable
                  key={p.visit_id + i}
                  onPress={() => router.push({ pathname: '/visits/[id]', params: { id: p.visit_id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatDate(p.date)}: ${p.value} ${unit}. Open visit`}
                  style={[ui.row, { minHeight: 44, justifyContent: 'space-between' }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}
                >
                  <Text style={ui.muted}>{formatDate(p.date)}</Text>
                  <Text style={ui.bodyBold}>{p.value}{unit ? ` ${unit}` : ''}</Text>
                </Pressable>
              ))}
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}
