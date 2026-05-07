import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Skeleton } from '@/components/Skeleton';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useLogout } from '@/features/auth/hooks/use-logout';

import { Fonts, PRIMARY, PRIMARY_DARK } from '../../constants/theme';

const fallbackProfileImage = require('../../assets/images/profile.jpeg');

const BACKGROUND = '#f0faf5';
const CARD_BG    = '#f3f3f4';
const MUTED_TEXT = '#3e4a40';

// ─── helpers ────────────────────────────────────────────────────────────────

function getDisplayName(
  fullName?: string,
  fallbackFullName?: string,
  firstName?: string,
  lastName?: string,
  email?: string,
): string {
  return (
    fullName ||
    fallbackFullName ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    email ||
    'SickleCare User'
  );
}

function getAge(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

function formatGenotype(genotype?: string): string {
  if (!genotype) return '--';
  const normalized = genotype.replace(/\s+/g, '').toUpperCase();
  if (normalized === 'HBSS') return 'Hb SS';
  if (normalized === 'HBSC') return 'Hb SC';
  return genotype;
}

function buildPatientId(patientId?: string, fallbackId?: string): string {
  if (patientId) return patientId;
  if (!fallbackId) return '--------';
  return fallbackId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

/** Capitalise first letter, e.g. "male" → "Male" */
function formatGender(gender?: string): string {
  if (!gender) return '--';
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
}

/** Format phone for display, e.g. "+233241234567" → "+233 24 123 4567" (simple fallback) */
function formatPhone(phone?: string): string {
  if (!phone) return '--';
  return phone; // return as-is; customise the regex here if needed
}

// ─── component ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { data: user, isLoading, refetch } = useCurrentUser();
  const logoutMutation = useLogout();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Map every field from the API response
  const name      = getDisplayName(user?.full_name, user?.fullName, user?.firstName, user?.lastName, user?.email);
  const email     = user?.email      ?? '--';
  const age       = getAge(user?.date_of_birth);
  const gender    = formatGender(user?.gender);
  const phone     = formatPhone(user?.phone_number);
  const genotype  = formatGenotype(user?.genotype);
  const patientId = buildPatientId(user?.patient_id, user?.id);
  const avatarSource = user?.avatarUrl ? { uri: user.avatarUrl } : fallbackProfileImage;

  const handleEditProfile = () => Alert.alert('Edit Profile', 'This screen will be connected soon.');

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logoutMutation.mutateAsync();
          } finally {
            router.replace('/(auth)/login');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {/* ── avatar ── */}
        <View style={styles.heroAvatar}>
          {isLoading ? null : <Image source={avatarSource} style={styles.heroAvatarImage} />}
        </View>

        {/* ── identity card ── */}
        <View style={styles.card}>
          {isLoading ? (
            <View style={{ gap: 14 }}>
              <Skeleton height={24} width="60%" radius={8} />
              <Skeleton height={16} width="40%" radius={6} />
              <View style={styles.divider} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Skeleton height={20} width="38%" radius={6} />
                <Skeleton height={20} width="38%" radius={6} />
              </View>
              <View style={styles.divider} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Skeleton height={20} width="38%" radius={6} />
                <Skeleton height={20} width="38%" radius={6} />
              </View>
              <View style={styles.divider} />
              <Skeleton height={20} width="70%" radius={6} />
            </View>
          ) : (
            <>
              <Text numberOfLines={1} style={styles.nameText}>{name}</Text>
              <Text style={styles.patientIdText}>ID: {patientId}</Text>

              <View style={styles.divider} />

              <View style={styles.statsRow}>
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>AGE</Text>
                  <Text style={styles.statValue}>{age !== null ? `${age} Years` : '--'}</Text>
                </View>
                <View style={[styles.statColumn, styles.statColumnRight]}>
                  <Text style={styles.statLabel}>GENOTYPE</Text>
                  <View style={styles.genotypeRow}>
                    <View style={styles.genotypeDot} />
                    <Text style={styles.statValue}>{genotype}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.statsRow}>
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>GENDER</Text>
                  <Text style={styles.statValue}>{gender}</Text>
                </View>
                <View style={[styles.statColumn, styles.statColumnRight]}>
                  <Text style={styles.statLabel}>PHONE</Text>
                  <Text style={[styles.statValue, styles.phoneValue]}>{phone}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View>
                <Text style={styles.statLabel}>EMAIL</Text>
                <Text numberOfLines={1} style={styles.statValue}>{email}</Text>
              </View>
            </>
          )}
        </View>

        {/* ── actions ── */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleEditProfile} style={styles.editButton}>
          <LinearGradient
            colors={[PRIMARY, PRIMARY_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={logoutMutation.isPending}
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <LinearGradient
            colors={['#ef4444', '#dc2626']} /* modern solid red gradient */
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <Text style={styles.logoutButtonText}>
              {logoutMutation.isPending ? 'Logging out…' : 'Log Out'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    backgroundColor: BACKGROUND,
    flex: 1,
  },

  // scroll content
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },

  // avatar
  heroAvatar: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD_BG,
    width: 230,
    height: 230,
    borderRadius: 115,
    marginBottom: 24,
    overflow: 'hidden',
  },
  heroAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // card
 card: {
  backgroundColor: CARD_BG,
  borderRadius: 26,
  paddingHorizontal: 22,
  paddingVertical: 28,

  // light border
  borderWidth: 1,
  borderColor: '#dde0e3',

  // shadow — iOS
  shadowColor: '#707070',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.0,
  shadowRadius: 12,

  // shadow — Android
  elevation: 4,
},
  nameText: {
    color: '#131920',
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  patientIdText: {
    color: MUTED_TEXT,
    fontFamily: Fonts.bodyMedium,
    fontSize: 18,
    marginBottom: 22,
  },
  divider: {
    backgroundColor: '#dfe2e4',
    height: 1,
    marginBottom: 22,
    marginTop: 4,
  },

  // stat rows
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statColumn: { flex: 1 },
  statColumnRight: { alignItems: 'flex-end' },
  statLabel: {
    color: MUTED_TEXT,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 8,
  },
  statValue: {
    color: '#121821',
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
  },
  phoneValue: {
    fontSize: 14, // slightly smaller so long numbers fit
  },

  // genotype indicator
  genotypeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  genotypeDot: {
    backgroundColor: '#099848',
    borderRadius: 7,
    height: 14,
    width: 14,
  },

  // buttons
  gradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    alignItems: 'center',
    borderRadius: 18,
    justifyContent: 'center',
    marginTop: 30,
    minHeight: 64,
    overflow: 'hidden',
  },
  editButtonText: {
    color:"white",
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
  },
  logoutButton: {
    alignItems: 'center',
    borderRadius: 18,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 64,
    overflow: 'hidden',
  },
  logoutButtonText: {
    color:"white",
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
  },
});
