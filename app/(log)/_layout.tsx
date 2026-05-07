import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { Fonts, PRIMARY } from '../../constants/theme';

function BackButton() {
  return (
    <TouchableOpacity
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      activeOpacity={0.7}
      style={styles.backBtn}
    >
      <Ionicons name="chevron-back" size={20} color="#0f172a" />
    </TouchableOpacity>
  );
}

const SCREEN_OPTIONS = {
  headerShown: true,
  headerStyle: { backgroundColor: '#ffffff' } as const,
  headerTitleStyle: {
    fontFamily: Fonts.headingBold,
    fontSize: 17,
    color: '#0f172a',
  },
  headerTintColor: PRIMARY,
  headerShadowVisible: false,
  headerBackTitleVisible: false,
  headerLeft: () => <BackButton />,
};

export default function LogLayout() {
  return (
    <Stack screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="symptoms"    options={{ title: 'Log Symptoms'     }} />
      <Stack.Screen name="medication"  options={{ title: 'Medication'        }} />
      <Stack.Screen name="lab"         options={{ title: 'Lab Results'       }} />
      <Stack.Screen name="hu-baseline" options={{ title: 'HU Baseline Setup' }} />
      <Stack.Screen name="visit-detail" options={{ title: 'Visit Details'    }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Platform.OS === 'ios' ? 8 : 4,
  },
});
