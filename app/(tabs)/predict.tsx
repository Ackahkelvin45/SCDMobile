import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, Fonts } from '../../constants/theme';

export default function PredictScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Ionicons name="analytics-outline" size={56} color={PRIMARY} style={styles.icon} />
      <Text style={styles.title}>Crisis Predictor</Text>
      <Text style={styles.sub}>AI-powered risk analysis based on your health data.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9f4', alignItems: 'center', justifyContent: 'center' },
  icon:  { marginBottom: 16, opacity: 0.8 },
  title: { fontSize: 22, fontFamily: Fonts.headingBold, color: '#0f172a', marginBottom: 8 },
  sub:   { fontSize: 14, fontFamily: Fonts.body, color: '#64748b', textAlign: 'center', paddingHorizontal: 40 },
});
