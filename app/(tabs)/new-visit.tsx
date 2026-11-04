import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, ErrorState, Loading, TextField, ui } from '@/components/ui';
import { GENOTYPES } from '@/constants/clinical';
import { C } from '@/constants/theme';
import { usePatients } from '@/hooks/api';
import { errorMessage } from '@/lib/api/api-error';
import { ageInYears, formatDate } from '@/lib/clinical';

const genotypeLabel = (g: string) => GENOTYPES.find((x) => x.value === g)?.label ?? g;

export default function NewVisitScreen() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const patients = usePatients(search ? { search, limit: 20 } : { ordering: '-last_visit_date', limit: 20 });
  const addPatient = () => router.push('/patients/new');

  return (
    <View style={st.fill}>
      <View style={st.top}>
        <TextField
          label="Find the patient"
          value={query}
          onChangeText={setQuery}
          placeholder="Name or folder no."
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <Text style={ui.muted}>{search ? 'Search results' : 'Recent patients'}</Text>
      </View>

      {patients.isLoading ? <Loading /> : patients.isError ? (
        <ErrorState message={errorMessage(patients.error)} onRetry={() => patients.refetch()} />
      ) : (
        <FlatList
          data={patients.data?.results ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={st.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={patients.isRefetching} onRefresh={() => patients.refetch()} tintColor={C.primary} />
          }
          renderItem={({ item: p }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/patients/[id]/new-visit', params: { id: p.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Start visit for ${p.full_name}, folder ${p.folder_number}`}
              style={({ pressed }) => [st.row, pressed && { opacity: 0.8 }]}
            >
              <View style={[st.fill, { gap: 3 }]}>
                <Text style={ui.bodyBold} numberOfLines={1}>{p.full_name}</Text>
                <Text style={ui.muted}>
                  Folder {p.folder_number} · {ageInYears(p.date_of_birth)} y · {p.sex === 'female' ? 'F' : 'M'} · {genotypeLabel(p.genotype)}
                </Text>
                <Text style={ui.muted}>Last visit: {formatDate(p.last_visit_date)}</Text>
              </View>
              <Ionicons name="add-circle-outline" size={22} color={C.primaryDark} />
            </Pressable>
          )}
          ListEmptyComponent={search ? (
            <EmptyState icon="search-outline" title="Patient not found" body={`No patient matches "${search}".`}
              action="Add new patient" onAction={addPatient} />
          ) : (
            <EmptyState icon="people-outline" title="No patients yet" body="Add your first patient to record a visit."
              action="Add new patient" onAction={addPatient} />
          )}
          ListFooterComponent={patients.data?.results.length ? (
            <Button title="Add new patient" variant="ghost" icon="person-add-outline" onPress={addPatient} />
          ) : null}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1 },
  top: { padding: 16, paddingBottom: 8, gap: 8, backgroundColor: C.bg },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 8, flexGrow: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, padding: 14,
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line,
  },
});
