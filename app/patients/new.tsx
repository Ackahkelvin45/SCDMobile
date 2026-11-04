import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';

import { PatientForm } from '@/components/PatientForm';
import { Button, Card, ui } from '@/components/ui';
import { C } from '@/constants/theme';
import { useCreatePatient } from '@/hooks/api';
import { errorMessage, fieldErrors, isApiCode } from '@/lib/api/api-error';
import type { PatientFields } from '@/lib/api/types';

type Match = { id: string; full_name: string; folder_number: string };

export default function NewPatientScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const create = useCreatePatient();
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [dupes, setDupes] = useState<{ fields: PatientFields; matches: Match[] } | null>(null);

  // Spec F3: when added inline from New Visit, continue straight to that patient's visit form.
  const go = (id: string) =>
    returnTo === 'new-visit'
      ? router.replace({ pathname: '/patients/[id]/new-visit', params: { id } })
      : router.replace({ pathname: '/patients/[id]', params: { id } });

  const submit = (fields: PatientFields, confirm = false) => {
    setServerErrors({});
    create.mutate(confirm ? { ...fields, confirm_duplicate: true } : fields, {
      onSuccess: (p) => { setDupes(null); go(p.id); },
      onError: (err) => {
        if (isApiCode(err, 'folder_number_taken')) {
          setServerErrors({ folder_number: 'This folder number is already registered in your facility.' });
        } else if (isApiCode(err, 'possible_duplicate')) {
          setDupes({ fields, matches: ((err.data as { matches?: Match[] })?.matches) ?? [] });
        } else {
          const fe = fieldErrors(err);
          setServerErrors(fe);
          if (Object.keys(fe).length === 0) Alert.alert('Could not save patient', errorMessage(err));
        }
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add patient' }} />
      <PatientForm submitLabel="Save patient" submitting={create.isPending} serverErrors={serverErrors} onSubmit={submit} />
      <Modal visible={!!dupes} transparent animationType="fade" onRequestClose={() => setDupes(null)}>
        <View style={st.backdrop}>
          <View style={st.card}>
            <Text style={ui.h2}>Possible duplicate</Text>
            <Text style={ui.muted}>A patient with the same name and date of birth already exists.</Text>
            {dupes?.matches.map((m) => (
              <Card key={m.id} style={{ gap: 8 }}>
                <Text style={ui.bodyBold}>{m.full_name}</Text>
                <Text style={ui.muted}>Folder {m.folder_number}</Text>
                <Button title="Open existing" variant="secondary" onPress={() => { setDupes(null); go(m.id); }} />
              </Card>
            ))}
            <Button title="Create anyway" onPress={() => dupes && submit(dupes.fields, true)} loading={create.isPending} />
            <Button title="Cancel" variant="ghost" onPress={() => setDupes(null)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 20, gap: 12 },
});
