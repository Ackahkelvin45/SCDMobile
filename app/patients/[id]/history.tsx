import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, Loading, ui } from '@/components/ui';
import { baselineChangeText, VisitHistoryItem } from '@/components/VisitHistoryItem';
import { C } from '@/constants/theme';
import { useBaselineHistory, useVisits } from '@/hooks/api';
import { errorMessage } from '@/lib/api/api-error';
import type { BaselineVersion, VisitHistoryRow } from '@/lib/api/types';
import { formatDate } from '@/lib/clinical';

type Item =
  | { kind: 'visit'; date: string; key: string; row: VisitHistoryRow }
  | { kind: 'baseline'; date: string; key: string; version: BaselineVersion; previous?: BaselineVersion };

export default function PatientHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // ponytail: one page of 200 rows, no infinite scroll; add offset paging if patients ever exceed that.
  const visits = useVisits(id, 200);
  const baselines = useBaselineHistory(id);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([visits.refetch(), baselines.refetch()]);
    setRefreshing(false);
  };

  const title = <Stack.Screen options={{ title: 'History' }} />;
  if (visits.isLoading) return <>{title}<Loading /></>;
  if (!visits.data) return <>{title}<ErrorState message={errorMessage(visits.error)} onRetry={() => visits.refetch()} /></>;

  const versions = baselines.data ?? []; // newest first
  // Interleave baseline changes with visits by date, newest first.
  const items: Item[] = [
    ...visits.data.results.map((row): Item => ({ kind: 'visit', date: row.lab_sample_date, key: `v${row.id}`, row })),
    ...versions.map((version, i): Item => ({
      kind: 'baseline', date: version.changed_at.slice(0, 10), key: `b${version.version_id}`, version, previous: versions[i + 1],
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      {title}
      <FlatList
        data={items}
        keyExtractor={(it) => it.key}
        contentContainerStyle={st.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.primary} />}
        ListHeaderComponent={baselines.isError ? <Text style={ui.muted}>Baseline changes couldn&apos;t be loaded.</Text> : null}
        ListEmptyComponent={<EmptyState title="No visits yet" body="Recorded visits and baseline changes appear here." />}
        renderItem={({ item }) =>
          item.kind === 'visit' ? <VisitHistoryItem row={item.row} /> : (
            <View style={st.baseline} accessibilityRole="text">
              <Text style={ui.bodyBold}>{formatDate(item.date)}</Text>
              <Text style={ui.body}>{baselineChangeText(item.version, item.previous)}</Text>
            </View>
          )
        }
      />
    </>
  );
}

const st = StyleSheet.create({
  list: { padding: 16, gap: 12, flexGrow: 1 },
  baseline: { backgroundColor: C.infoSoft, borderRadius: 14, padding: 14, gap: 4 },
});
