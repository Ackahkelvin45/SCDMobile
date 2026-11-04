import { Mulish_400Regular, Mulish_500Medium, Mulish_600SemiBold, Mulish_700Bold, useFonts as useMulish } from '@expo-google-fonts/mulish';
import { Syne_600SemiBold, Syne_700Bold, Syne_800ExtraBold, useFonts as useSyne } from '@expo-google-fonts/syne';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack, useSegments } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { IdleLock } from '@/components/IdleLock';
import { C, Fonts } from '@/constants/theme';
import { useAuthSession, useLogout } from '@/hooks/api';
import { tokenStore } from '@/lib/api';
import { secureStorageAdapter } from '@/lib/api/secure-storage-adapter';
import { clearAllDrafts } from '@/lib/drafts';
import { AppQueryProvider } from '@/providers/app-query-provider';

tokenStore.configureAdapter(secureStorageAdapter);
SplashScreen.preventAutoHideAsync();

export const unstable_settings = { initialRouteName: 'index' };

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, primary: C.primaryDark } };

export default function RootLayout() {
  const [mulish] = useMulish({ Mulish_400Regular, Mulish_500Medium, Mulish_600SemiBold, Mulish_700Bold });
  const [syne] = useSyne({ Syne_600SemiBold, Syne_700Bold, Syne_800ExtraBold });
  const fontsLoaded = mulish && syne;

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AppQueryProvider>
      <ThemeProvider value={theme}>
        <SessionGuard>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: C.surface },
              headerTitleStyle: { fontFamily: Fonts.headingBold, fontSize: 17, color: C.text },
              headerTintColor: C.primaryDark,
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: C.bg },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </SessionGuard>
      </ThemeProvider>
    </AppQueryProvider>
  );
}

/**
 * Spec US1.5/US1.6 + appendix: when the session ends (sign-out or failed refresh) go to sign-in;
 * while signed in, block screenshots/screen recording and run the idle lock.
 */
function SessionGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady } = useAuthSession();
  const segments = useSegments();
  const logout = useLogout();
  const first = segments[0] as string | undefined; // undefined = splash (app/index)
  const inPublicArea = !first || first === '(auth)';

  useEffect(() => {
    if (isReady && !isAuthenticated && !inPublicArea) router.replace('/(auth)/login');
  }, [isReady, isAuthenticated, inPublicArea]);

  useEffect(() => {
    // ponytail: global while signed in; per-screen only if a non-PHI screen ever needs screenshots.
    (isAuthenticated ? ScreenCapture.preventScreenCaptureAsync() : ScreenCapture.allowScreenCaptureAsync()).catch(() => {});
  }, [isAuthenticated]);

  const signOut = () => {
    logout.mutate(undefined, { onSettled: () => { clearAllDrafts(); router.replace('/(auth)/login'); } });
  };

  return <IdleLock active={isAuthenticated} onSignOut={signOut}>{children}</IdleLock>;
}
