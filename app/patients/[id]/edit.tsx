import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';

import { formToFields, PatientForm, patientToForm } from '@/components/PatientForm';
import { Banner, EmptyState, ErrorState, Loading } from '@/components/ui';
import { usePatient, useUpdatePatient } from '@/hooks/api';
import { ApiError, errorMessage, fieldErrors, isApiCode } from '@/lib/api/api-error';
import type { PatientFields } from '@/lib/api/types';

export default function EditPatientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const patient = usePatient(id);
  const update = useUpdatePatient(id);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const title = <Stack.Screen options={{ title: 'Edit patient' }} />;
  if (patient.isLoading) return <>{title}<Loading /></>;
  if (patient.error instanceof ApiError && patient.error.status === 404) {
    return <>{title}<EmptyState icon="person-outline" title="Patient not found" /></>;
  }
  if (!patient.data) return <>{title}<ErrorState message={errorMessage(patient.error)} onRetry={() => patient.refetch()} /></>;

  // Compare normalised before/after so only real changes are sent (and audit-logged).
  const before = formToFields(patientToForm(patient.data));
  const submit = (after: PatientFields) => {
    const changed = Object.fromEntries(
      (Object.keys(after) as (keyof PatientFields)[])
        .filter((k) => JSON.stringify(after[k] ?? null) !== JSON.stringify(before[k] ?? null))
        .map((k) => [k, after[k]]),
    ) as Partial<PatientFields>;
    if (Object.keys(changed).length === 0) return router.back();
    setServerErrors({});
    update.mutate(changed, {
      onSuccess: () => router.back(),
      onError: (err) => {
        if (isApiCode(err, 'folder_number_taken')) {
          return setServerErrors({ folder_number: 'This folder number is already registered in your facility.' });
        }
        const fe = fieldErrors(err);
        setServerErrors(fe);
        if (Object.keys(fe).length === 0) Alert.alert('Could not save changes', errorMessage(err));
      },
    });
  };

  return (
    <>
      {title}
      <PatientForm
        initial={patient.data}
        submitLabel="Save changes"
        submitting={update.isPending}
        serverErrors={serverErrors}
        onSubmit={submit}
        header={<Banner tone="warn" text="Changing date of birth, sex or genotype marks this patient's existing predictions as outdated." />}
      />
    </>
  );
}
