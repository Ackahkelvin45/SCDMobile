import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { PRIMARY, Fonts } from '../constants/theme';

const fallbackProfileImage = require('../assets/images/profile.jpeg');

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function getFirstName(user?: { full_name?: string; fullName?: string; email?: string }): string {
  const raw = user?.full_name || user?.fullName || user?.email || '';
  const first = raw.trim().split(/\s+/)[0];
  return first || 'there';
}

export function NavHeader() {
  const insets = useSafeAreaInsets();
  const { data: user } = useCurrentUser();
  const firstName = getFirstName(user);
  const greeting = getGreeting();
  const avatarSource = user?.avatarUrl ? { uri: user.avatarUrl } : fallbackProfileImage;

  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerContent}>
        <View style={styles.avatar}>
          <Image source={avatarSource} style={styles.avatarImg} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerSmall}>{greeting}</Text>
          <Text numberOfLines={1} style={styles.headerName}>{firstName} 👋</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={20} color="#0f172a" />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: `${PRIMARY}18`,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 42, height: 42, borderRadius: 21 },
  headerText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerSmall: { fontSize: 14, fontFamily: Fonts.body, color: '#64748b' },
  headerName: { fontSize: 16, fontFamily: Fonts.bodyBold, color: '#0f172a' },
  bellBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#f8fafc',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  notifDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5, borderColor: '#fff',
  },
});
