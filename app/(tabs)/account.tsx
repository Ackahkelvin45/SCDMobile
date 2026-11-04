import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { Banner, Button, Card, ErrorState, KeyValue, Loading, Screen, SectionTitle, TextField, ui } from '@/components/ui';
import { useLogout, useMe, useUpdateMe } from '@/hooks/api';
import { errorMessage, fieldErrors } from '@/lib/api/api-error';
import { clearAllDrafts, hasAnyDrafts } from '@/lib/drafts';

const STATUS_LABEL = { pending: 'Pending approval', active: 'Active', deactivated: 'Deactivated' } as const;

export default function AccountScreen() {
  const me = useMe();
  const update = useUpdateMe();
  const logout = useLogout();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (me.isLoading) return <Loading />;
  if (me.isError || !me.data) return <ErrorState message={errorMessage(me.error)} onRetry={() => me.refetch()} />;
  const user = me.data;

  const startEdit = () => {
    setName(user.full_name);
    setPhone(user.phone_number);
    setErrors({});
    setFormError(null);
    setEditing(true);
  };

  const save = async () => {
    if (!name.trim()) {
      setErrors({ full_name: 'Enter your full name.' });
      return;
    }
    try {
      await update.mutateAsync({ full_name: name.trim(), phone_number: phone.trim() });
      setEditing(false);
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
    }
  };

  const doSignOut = () =>
    logout.mutate(undefined, {
      onSettled: () => {
        clearAllDrafts();
        router.replace('/(auth)/login');
      },
    });

  const signOut = async () => {
    if (await hasAnyDrafts()) {
      Alert.alert('Sign out?', 'Unsaved visit drafts on this device will be deleted.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: doSignOut },
      ]);
    } else doSignOut();
  };

  return (
    <Screen refreshing={me.isRefetching} onRefresh={() => me.refetch()}>
      <SectionTitle title="Profile" action={editing ? undefined : 'Edit'} onAction={startEdit} />
      <Card>
        {editing ? (
          <>
            {formError ? <Banner tone="danger" text={formError} /> : null}
            <TextField label="Full name" value={name} onChangeText={setName} error={errors.full_name} autoComplete="name" />
            <TextField label="Phone number" value={phone} onChangeText={setPhone} error={errors.phone_number}
              keyboardType="phone-pad" autoComplete="tel" />
            <Button title="Save" onPress={save} loading={update.isPending} />
            <Button title="Cancel" variant="secondary" onPress={() => setEditing(false)} disabled={update.isPending} />
          </>
        ) : (
          <>
            <KeyValue label="Name" value={user.full_name} strong />
            <KeyValue label="Phone" value={user.phone_number || '—'} />
          </>
        )}
        <KeyValue label="Email" value={user.email} />
        <KeyValue label="Licence no." value={user.license_number} />
        <KeyValue label="Facility" value={user.facility?.name ?? '—'} />
        <KeyValue label="Status" value={STATUS_LABEL[user.status] ?? user.status} />
      </Card>

      <SectionTitle title="Security" />
      <Button title="Change password" variant="secondary" icon="key-outline" onPress={() => router.push('/account/change-password')} />
      <Button title="Sign out" variant="danger" icon="log-out-outline" onPress={signOut} loading={logout.isPending} />

      {Constants.expoConfig?.version ? (
        <Text style={[ui.muted, { textAlign: 'center' }]}>SickleCare v{Constants.expoConfig.version}</Text>
      ) : null}
    </Screen>
  );
}
