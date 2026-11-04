import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { emptyVisitForm, VisitForm, VisitFormState } from '@/components/VisitForm';
import { Banner, Button, ErrorState, Loading } from '@/components/ui';
import { useCreateVisit, usePatient, useVisit, useVisits } from '@/hooks/api';
import { ApiError, errorMessage, fieldErrors, isApiCode } from '@/lib/api/api-error';
import type { VisitPayload } from '@/lib/api/types';
import { deleteDraft, loadDraft, saveDraft } from '@/lib/drafts';

type Draft = { form: VisitFormState; savedAt: number };

export default function NewVisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const patient = usePatient(id);
  const lastRow = useVisits(id, 1).data?.results[0];
  const lastVisit = useVisit(lastRow?.id).data;
  const create = useCreateVisit(id);

  const [form, setForm] = useState<VisitFormState>(emptyVisitForm);
  const [draftChecked, setDraftChecked] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<VisitPayload | null>(null);
  const touched = useRef(false);
  const saved = useRef(false);

  useEffect(() => {
    let active = true;
    loadDraft<Draft>(id).then((d) => {
      if (!active) return;
      setDraftChecked(true);
      if (!d?.form) return;
      const when = new Date(d.savedAt);
      Alert.alert('Unfinished visit', `Resume draft from ${when.toLocaleDateString()} ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}?`, [
        { text: 'Discard', style: 'destructive', onPress: () => { deleteDraft(id).catch(() => {}); } },
        { text: 'Resume', onPress: () => setForm(d.form) },
      ]);
    });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!touched.current) return;
    const t = setTimeout(() => {
      if (!saved.current) saveDraft<Draft>(id, { form, savedAt: Date.now() }).catch(() => {});
    }, 1000);
    return () => clearTimeout(t);
  }, [form, id]);

  const onChange = (v: VisitFormState) => { touched.current = true; setForm(v); };

  const submit = async (payload: VisitPayload): Promise<void> => {
    setErrors({});
    setFailed(null);
    try {
      const visit = await create.mutateAsync(payload);
      saved.current = true;
      await deleteDraft(id).catch(() => {});
      router.replace({ pathname: '/visits/[id]', params: { id: visit.id, justSaved: '1' } });
    } catch (e) {
      if (isApiCode(e, 'duplicate_visit_date')) {
        Alert.alert('Duplicate date', 'A visit already exists on this date. Save anyway?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save anyway', onPress: () => { submit({ ...payload, confirm_duplicate: true }); } },
        ]);
        return;
      }
      const fe = fieldErrors(e);
      if (Object.keys(fe).length) {
        setErrors(fe);
        Alert.alert('Check the form', 'The server rejected some values. They are marked on the form.');
        return;
      }
      if (e instanceof ApiError && e.status < 500) {
        // Rejected request with no field detail: show it, retrying won't help.
        Alert.alert('Could not save', errorMessage(e));
        return;
      }
      // Network failure: keep the draft so nothing is lost.
      await saveDraft<Draft>(id, { form, savedAt: Date.now() }).catch(() => {});
      setFailed(payload);
    }
  };

  if (patient.isLoading || !draftChecked) return <Loading />;
  if (patient.isError || !patient.data) return <ErrorState message={errorMessage(patient.error)} onRetry={patient.refetch} />;
  const p = patient.data;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'New visit' }} />
      <VisitForm
        mode="create"
        patient={p}
        value={form}
        onChange={onChange}
        onSubmit={submit}
        errors={errors}
        previous={lastVisit ?? lastRow ?? null}
        previousLabel="Last visit"
        baselineHgb={p.hu?.baseline_hgb}
        banner={failed ? (
          <View style={{ gap: 8 }}>
            <Banner tone="warn" title="Not sent" text="Saved as draft on this phone. Check your connection and retry." />
            <Button title="Retry" icon="refresh" loading={create.isPending} onPress={() => submit(failed)} />
          </View>
        ) : null}
      />
    </View>
  );
}
