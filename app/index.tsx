import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PRIMARY, PRIMARY_DARK, Fonts } from '../constants/theme';
const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const lottieScale = useRef(new Animated.Value(0.8)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Fade the whole screen in
    Animated.timing(containerOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // 2. Spring the lottie in
    Animated.spring(lottieScale, {
      toValue: 1,
      tension: 55,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // 3. Slide up app name after lottie settles
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 4. Fade tagline
    Animated.sequence([
      Animated.delay(850),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to onboarding after animation
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.fill, { opacity: containerOpacity }]}>
      <LinearGradient
        colors={[PRIMARY, PRIMARY_DARK, '#0d5c2e']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.container}
      >
        <StatusBar style="light" />

        {/* Lottie animation */}
        <Animated.View style={[styles.lottieWrapper, { transform: [{ scale: lottieScale }] }]}>
          <LottieView
            source={require('../assets/lottie/landing.json')}
            autoPlay
            loop={false}
            style={styles.lottie}
            colorFilters={[{ keypath: '**', color: '#ffffff' }]}
          />
        </Animated.View>

        {/* App name */}
        <Animated.View
          style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }], alignItems: 'center' }}
        >
          <Text style={styles.appName}>
            Sickle<Text style={styles.appNameAccent}>Care</Text>
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Managing sickle cell, one day at a time.
        </Animated.Text>

        {/* Bottom badge */}
        <Animated.View style={[styles.bottomBadge, { opacity: taglineOpacity }]}>
          <View style={styles.badgeDot} />
          <Text style={styles.bottomText}>Your health companion</Text>
          <View style={styles.badgeDot} />
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  lottieWrapper: {
    width: width * 0.62,
    height: width * 0.62,
    marginBottom: 4,
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 40,
    fontFamily: Fonts.headingBold,
    color: '#ffffff',
    letterSpacing: -1.2,
    marginTop: 8,
  },
  appNameAccent: {
    color: '#bbf7d0',
  },
  tagline: {
    fontSize: 17,
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  bottomBadge: {
    position: 'absolute',
    bottom: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  bottomText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
