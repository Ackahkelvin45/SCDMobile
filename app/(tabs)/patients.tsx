import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button, Chip, EmptyState, ErrorState, Loading, TextField, ui } from '@/components/ui';
import { GENOTYPES } from '@/constants/clinical';
import { C, Fonts } from '@/constants/theme';
import { usePatients } from '@/hooks/api';
import { errorMessage } from '@/lib/api/api-error';
import type { PatientListItem } from '@/lib/api/types';
import { ageInYears, formatDate } from '@/lib/clinical';

const genotypeLabel = (g: string) => GENOTYPES.find((x) => x.value === g)?.label ?? g;

export default function PatientsScreen() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [hasFlags, setHasFlags] = useState(false);
  const [noBaseline, setNoBaseline] = useState(false);

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

function PatientRow({ p }: { p: PatientListItem }) {
  const flags = p.active_flag_count ?? 0;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/patients/[id]', params: { id: p.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${p.full_name}, folder ${p.folder_number}${flags ? `, ${flags} active flags` : ''}`}
      style={({ pressed }) => [st.row, pressed && { opacity: 0.8 }]}
    >
      <View style={[st.fill, { gap: 3 }]}>
        <View style={ui.row}>
          <Text style={[ui.bodyBold, { flexShrink: 1 }]} numberOfLines={1}>{p.full_name}</Text>
          {p.baseline_missing ? <View style={st.tag}><Text style={st.tagText}>No baseline</Text></View> : null}
        </View>
        <Text style={ui.muted}>
          Folder {p.folder_number} · {ageInYears(p.date_of_birth)} y · {p.sex === 'female' ? 'F' : 'M'} · {genotypeLabel(p.genotype)}
        </Text>
        <Text style={ui.muted}>Last visit: {formatDate(p.last_visit_date)}</Text>
      </View>
      {flags > 0 ? (
        <View style={st.flag}>
          <Ionicons name="flag" size={12} color={C.danger} />
          <Text style={st.flagText}>{flags}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={C.faint} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1 },
  top: { padding: 16, paddingBottom: 8, gap: 10, backgroundColor: C.bg },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 8, flexGrow: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, padding: 14,
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line,
  },
  tag: { backgroundColor: C.warnSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: C.warn },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.dangerSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  flagText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: C.danger },
});
