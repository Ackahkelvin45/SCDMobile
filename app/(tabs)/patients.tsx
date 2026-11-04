import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { PatientRow } from '@/components/PatientRow';
import { Button, Chip, EmptyState, ErrorState, Loading, TextField, ui } from '@/components/ui';
import { C } from '@/constants/theme';
import { usePatients } from '@/hooks/api';
import { errorMessage } from '@/lib/api/api-error';

export default function PatientsScreen() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [hasFlags, setHasFlags] = useState(false);
  const [noBaseline, setNoBaseline] = useState(false);

  // The Today dashboard links here with ?filter=no_baseline or ?filter=has_flags.
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  useEffect(() => {
    if (!filter) return;
    setNoBaseline(filter === 'no_baseline');
    setHasFlags(filter === 'has_flags');
  }, [filter]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // ponytail: first 100 results only; add infinite scroll (offset) when facilities exceed that.
  const patients = usePatients({
    search: search || undefined,
    has_flags: hasFlags || undefined,
    baseline_missing: noBaseline || undefined,
    ordering: '-last_visit_date',
    limit: 100,
  });
  const filtered = !!(search || hasFlags || noBaseline);

  return (
    <View style={st.fill}>
      <View style={st.top}>
        <TextField
          label="Search"
          value={query}
          onChangeText={setQuery}
          placeholder="Name or folder no."
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View style={ui.row}>
            <Chip label="Has flags" selected={hasFlags} onPress={() => setHasFlags((v) => !v)} />
            <Chip label="No baseline" selected={noBaseline} onPress={() => setNoBaseline((v) => !v)} />
          </View>
          <Button title="Add patient" icon="person-add-outline" onPress={() => router.push('/patients/new')} style={{ minHeight: 44 }} />
        </View>
      </View>

      {patients.isLoading ? <Loading /> : patients.isError ? (
        <ErrorState message={errorMessage(patients.error)} onRetry={() => patients.refetch()} />
      ) : (
        <FlatList
          data={patients.data?.results ?? []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PatientRow p={item} />}
          contentContainerStyle={st.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={patients.isRefetching} onRefresh={() => patients.refetch()} tintColor={C.primary} />
          }
          ListEmptyComponent={filtered ? (
            <EmptyState icon="search-outline" title="No matching patients" body="Try a different name or folder number, or clear the filters." />
          ) : (
            <EmptyState icon="people-outline" title="No patients yet" body="Add your first patient to start recording visits."
              action="Add patient" onAction={() => router.push('/patients/new')} />
          )}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1 },
  top: { padding: 16, paddingBottom: 8, gap: 10, backgroundColor: C.bg },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 8, flexGrow: 1 },
});
