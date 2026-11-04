import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner, Button, Screen, TextField, ui } from '@/components/ui';
import { C, Fonts } from '@/constants/theme';
import { useLogin } from '@/hooks/api';
import { errorMessage, isApiCode } from '@/lib/api/api-error';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { env } from '@/lib/config/env';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    try {
      await login.mutateAsync({ email: email.trim(), password });
      router.replace('/(tabs)');
    } catch (err) {
      if (isApiCode(err, 'account_pending')) {
        router.replace('/(auth)/awaiting-approval');
        return;
      }
      setError(isApiCode(err, 'account_deactivated')
        ? 'This account has been deactivated. Contact your facility administrator.'
        : errorMessage(err));
    }
  };

  const forgotPassword = () => {
    WebBrowser.openBrowserAsync(`${env.apiBaseUrl}${API_ENDPOINTS.auth.passwordResetPage}`).catch(() =>
      setError('Could not open the password reset page.'));
  };

  return (
    <Screen contentStyle={{ paddingTop: insets.top + 32 }}>
      <View style={{ gap: 6 }}>
        <Text style={st.brand}>SickleCare</Text>
        <Text style={ui.h1} accessibilityRole="header">Clinician sign in</Text>
        <Text style={ui.muted}>Sign in to manage patients on hydroxyurea.</Text>
      </View>

      {error ? <Banner tone="danger" text={error} /> : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
        placeholder="you@hospital.org"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        onSubmitEditing={submit}
        returnKeyType="go"
      />

      <Pressable onPress={forgotPassword} hitSlop={8} accessibilityRole="link" style={st.link}>
        <Text style={st.linkText}>Forgot password?</Text>
      </Pressable>

      <Button title="Sign in" onPress={submit} loading={login.isPending} />
      <Button title="Request an account" variant="ghost" onPress={() => router.push('/(auth)/register')} />
    </Screen>
  );
}

const st = StyleSheet.create({
  brand: { fontFamily: Fonts.headingExtraBold, fontSize: 28, color: C.primaryDark, marginBottom: 12 },
  link: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
  linkText: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: C.primaryDark },
});
