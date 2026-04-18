import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, PRIMARY_DARK, Fonts } from '../../constants/theme';

const BG = '#e1f3ec31';

export default function SignupSuccessScreen() {
  const insets = useSafeAreaInsets();

  const imageScale = useRef(new Animated.Value(0.7)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(imageScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(imageOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(badgeScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(contentTranslateY, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="dark" />

      {/* Centre content — illustration + text */}
      <View style={styles.centerContent}>
        {/* Illustration */}
        <View style={styles.imageWrapper}>
          <Animated.Image
            source={require('../../assets/images/onboarding/signupsucess.png')}
            style={[styles.image, { opacity: imageOpacity, transform: [{ scale: imageScale }] }]}
            resizeMode="contain"
          />
        </View>

        {/* Text content */}
        <Animated.View
          style={[
            styles.content,
            { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] },
          ]}
        >
          <Text style={styles.title}>You're all set!</Text>
          <Text style={styles.subtitle}>
            Your SickleCare account has been created.{'\n'}
            Let's start managing your health journey.
          </Text>
        </Animated.View>
      </View>

      {/* CTA pinned to bottom */}
      <Animated.View style={[styles.btnArea, { opacity: contentOpacity }]}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.primaryBtnText}>Go to Dashboard</Text>
          <View style={styles.arrowBox}>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'space-between', // pushes btn to bottom
    paddingHorizontal: 28,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  image: {
    width: 300,
    height: 300,
  },
  badge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  content: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
    marginBottom: 15,
    textAlign: 'center',
    marginTop: 30,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  pill: {
    backgroundColor: `${PRIMARY}18`,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
    color: PRIMARY_DARK,
  },
  btnArea: {
    width: '100%',
  },
  primaryBtn: {
    height: 58,
    backgroundColor: PRIMARY_DARK,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
    }),
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
    color: '#fff',
    letterSpacing: 0.3,
  },
  arrowBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});