import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Banner, Button, Screen, TextField } from '@/components/ui';
import { useChangePassword } from '@/hooks/api';
import { errorMessage, fieldErrors } from '@/lib/api/api-error';

type Form = { old_password: string; new_password: string; new_password2: string };

export default function ChangePasswordScreen() {
  const change = useChangePassword();
  const [form, setForm] = useState<Form>({ old_password: '', new_password: '', new_password2: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.old_password) e.old_password = 'Enter your current password.';
    if (form.new_password.length < 8) e.new_password = 'Use at least 8 characters.';
    if (form.new_password2 !== form.new_password) e.new_password2 = 'Passwords do not match.';
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    try {
      await change.mutateAsync(form);
      Alert.alert('Password changed', 'Use your new password next time you sign in.');
      router.back();
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Change password' }} />
      {formError ? <Banner tone="danger" text={formError} /> : null}
      <TextField label="Current password" value={form.old_password} onChangeText={set('old_password')} error={errors.old_password}
        secureTextEntry autoComplete="current-password" textContentType="password" />
      <TextField label="New password" value={form.new_password} onChangeText={set('new_password')} error={errors.new_password}
        secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="At least 8 characters" />
      <TextField label="Confirm new password" value={form.new_password2} onChangeText={set('new_password2')} error={errors.new_password2}
        secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <Button title="Change password" onPress={submit} loading={change.isPending} />
    </Screen>
  );
}
