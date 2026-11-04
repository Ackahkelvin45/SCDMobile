import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';

import { CompareValues, VisitForm, VisitFormState, visitToForm } from '@/components/VisitForm';
import { Banner, ErrorState, Loading } from '@/components/ui';
import { usePatient, useUpdateVisit, useVisit } from '@/hooks/api';
import { errorMessage, fieldErrors, isApiCode } from '@/lib/api/api-error';
import type { VisitPayload } from '@/lib/api/types';

export default function EditVisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const visit = useVisit(id);
  const patient = usePatient(visit.data?.patient_id);
  const update = useUpdateVisit(id);
  const [form, setForm] = useState<VisitFormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (visit.isLoading || patient.isLoading) return <Loading />;
  if (visit.isError || !visit.data) return <ErrorState message={errorMessage(visit.error)} onRetry={visit.refetch} />;
  if (patient.isError || !patient.data) return <ErrorState message={errorMessage(patient.error)} onRetry={patient.refetch} />;
  const v = visit.data;

  const send = async (payload: VisitPayload): Promise<void> => {
    setErrors({});
    try {
      await update.mutateAsync({ ...payload, edit_reason: payload.edit_reason ?? '' });
      router.back();
    } catch (e) {
      if (isApiCode(e, 'duplicate_visit_date')) {
        Alert.alert('Duplicate date', 'A visit already exists on this date. Save anyway?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save anyway', onPress: () => { send({ ...payload, confirm_duplicate: true }); } },
        ]);
        return;
      }
      const fe = fieldErrors(e);
      setErrors(fe);
      Alert.alert('Could not save changes', Object.keys(fe).length ? 'Some values were rejected. They are marked on the form.' : errorMessage(e));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Edit visit' }} />
      <VisitForm
        mode="edit"
        patient={patient.data}
        value={form ?? visitToForm(v)}
        onChange={setForm}
        requireReason
        onSubmit={send}
        errors={errors}
        previous={v as CompareValues}
        previousLabel="Before edit"
        baselineHgb={patient.data.hu?.baseline_hgb}
        banner={<Banner tone="warn" text="Editing re-checks safety flags and marks this visit's prediction outdated." />}
      />
    </View>
  );
}
