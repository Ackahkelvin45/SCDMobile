import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner, Button, ErrorState, Loading, Screen, SelectField, TextField, ui } from '@/components/ui';
import { C, Fonts } from '@/constants/theme';
import { useFacilities, useLogin, useSignUp } from '@/hooks/api';
import { errorMessage, fieldErrors } from '@/lib/api/api-error';
import type { SignUpPayload } from '@/lib/api/types';

type Form = SignUpPayload;
const EMPTY: Form = {
  full_name: '', email: '', phone_number: '', license_number: '', facility_id: '', password: '', password2: '',
};

function validate(f: Form): Partial<Record<keyof Form, string>> {
  const e: Partial<Record<keyof Form, string>> = {};
  if (!f.full_name.trim()) e.full_name = 'Enter your full name.';
  if (!f.email.trim()) e.email = 'Enter your email.';
  else if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email.';
  if (!f.phone_number.trim()) e.phone_number = 'Enter your phone number.';
  if (!f.license_number.trim()) e.license_number = 'Enter your licence number.';
  if (!f.facility_id) e.facility_id = 'Choose your facility.';
  if (f.password.length < 8) e.password = 'Use at least 8 characters.';
  if (f.password2 !== f.password) e.password2 = 'Passwords do not match.';
  return e;
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const facilities = useFacilities();
  const signUp = useSignUp();
  const login = useLogin();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const e = validate(form);
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    try {
      await signUp.mutateAsync({
        ...form,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
        license_number: form.license_number.trim(),
      });
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors({ ...fe, facility_id: fe.facility_id ?? fe.facility });
      setFormError(errorMessage(err));
      return;
    }
    // No approval step: sign straight in. The account already exists, so if this fails send them to sign-in.
    try {
      await login.mutateAsync({ email: form.email.trim(), password: form.password });
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Account created', 'Your account is ready. Please sign in.');
      router.replace('/(auth)/login');
    }
  };

  return (
    <Screen contentStyle={{ paddingTop: insets.top + 16 }}>
      <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={st.back}>
        <Ionicons name="chevron-back" size={24} color={C.text} />
      </Pressable>
      <View style={{ gap: 6 }}>
        <Text style={ui.h1} accessibilityRole="header">Create an account</Text>
        <Text style={ui.muted}>
          For doctors at a registered facility. Your licence number is recorded with your account.
        </Text>
      </View>

      {formError ? <Banner tone="danger" text={formError} /> : null}

      <TextField label="Full name" value={form.full_name} onChangeText={set('full_name')} error={errors.full_name}
        autoComplete="name" textContentType="name" />
      <TextField label="Email" value={form.email} onChangeText={set('email')} error={errors.email}
        autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      <TextField label="Phone number" value={form.phone_number} onChangeText={set('phone_number')} error={errors.phone_number}
        keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
      <TextField label="Licence number" value={form.license_number} onChangeText={set('license_number')} error={errors.license_number}
        autoCapitalize="characters" hint="Medical and Dental Council registration number" />

      {facilities.isLoading ? <Loading /> : facilities.isError ? (
        <ErrorState message={errorMessage(facilities.error)} onRetry={() => facilities.refetch()} />
      ) : !facilities.data?.length ? (
        <View style={{ gap: 6 }}>
          <Text style={st.label}>Facility</Text>
          <Text style={ui.muted}>No facilities available yet. Contact your administrator.</Text>
        </View>
      ) : (
        <SelectField
          label="Facility"
          placeholder="Select your facility"
          sheetTitle="Choose your facility"
          options={facilities.data.map((f) => ({ value: f.id, label: f.name, sublabel: f.region }))}
          value={form.facility_id || null}
          onChange={set('facility_id')}
          error={errors.facility_id}
        />
      )}

      <TextField label="Password" value={form.password} onChangeText={set('password')} error={errors.password}
        secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="At least 8 characters" />
      <TextField label="Confirm password" value={form.password2} onChangeText={set('password2')} error={errors.password2}
        secureTextEntry autoComplete="new-password" textContentType="newPassword" />

      <Button title="Create account" onPress={submit} loading={signUp.isPending || login.isPending} />
      <Button title="I already have an account" variant="ghost" onPress={() => router.replace('/(auth)/login')} />
    </Screen>
  );
}

const st = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  label: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: C.text },
});
