import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, PRIMARY_DARK, Fonts } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.44;

const SLIDES = [
  {
    id: '1',
    image: require('../assets/images/onboarding/african-american-pediatrician-nurse-discussing-sickness-symptoms-with-sick-little-child.jpg'),
    tag: 'CLINIC VISITS',
    title: 'Track Your\nLabs & Health',
    subtitle:
      'Easily log your clinic visits, track your lab results, and manage your Hydroxyurea treatment over time.',
  },
  {
    id: '2',
    image: require('../assets/images/onboarding/new-test-concentrated-skilled-researchers-wearing-uniform-doing-test-creating-vaccine.jpg'),
    tag: 'AI INSIGHTS',
    title: 'Predict Your\nHU Response',
    subtitle:
      'Get an AI-powered prediction of your likelihood to respond to Hydroxyurea by your next follow-up visit.',
  },
  {
    id: '3',
    image: require('../assets/images/onboarding/medium-shot-smiley-doctor-checking-patient.jpg'),
    tag: 'EMPOWERED CARE',
    title: 'Stay Ahead of\nYour Health',
    subtitle:
      'Work alongside your clinician to monitor your progress, adjust your dose, and make informed decisions.',
  },
];

//     Dot Indicator   
function Dots({
  scrollX,
  count,
}: {
  scrollX: Animated.Value;
  count: number;
}) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: count }).map((_, i) => {
        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 28, 8],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={i}
            style={[dotStyles.dot, { width: dotWidth, opacity }]}
          />
        );
      })}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 22,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
});

//     Main Component                                                             
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  // Per-card content (title + subtitle) animations
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Button scale for press feel
  const btnScale = useRef(new Animated.Value(1)).current;

  const isLast = activeIndex === SLIDES.length - 1;

  // scroll sync   
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / width);
        if (idx !== activeIndex) setActiveIndex(idx);
      },
    }
  );

  // animate card text out then in when slide changes                         
  const animateCard = useCallback(
    (toIndex: number) => {
      Animated.sequence([
        // fade + slide up out
        Animated.parallel([
          Animated.timing(cardOpacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(cardTranslateY, {
            toValue: -18,
            duration: 180,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // scroll the list
        flatListRef.current?.scrollToIndex({ index: toIndex, animated: true });
        setActiveIndex(toIndex);

        // Reset position instantly then fade in
        cardTranslateY.setValue(18);
        Animated.parallel([
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.spring(cardTranslateY, {
            toValue: 0,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [cardOpacity, cardTranslateY]
  );

  //  button press animation                                                    
  const onPressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 120,
      friction: 6,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 6,
    }).start();
  };

  const handleContinue = () => {
    if (isLast) {
      router.replace('/(auth)/register');
    } else {
      animateCard(activeIndex + 1);
    }
  };

  const handleSkip = () => {
    animateCard(SLIDES.length - 1);
  };
         
  const renderSlide = ({ item }: { item: (typeof SLIDES)[0] }) => (
    <View style={{ width, height }}>
      <Image source={item.image} style={styles.image} resizeMode="cover" />
      <View style={styles.scrim} />
    </View>
  );

  const slide = SLIDES[activeIndex];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ── Image Pager */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* ── Floating Skip Button   */}
      {!isLast && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: insets.top + 16 }]}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Bottom Card  */}
      <View
        style={[
          styles.card,
          { height: CARD_HEIGHT, paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Dots */}
        <Dots scrollX={scrollX} count={SLIDES.length} />

        {/* Animated text content */}
        <Animated.View
          style={{
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }],
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* Tag */}
          <View style={styles.tag}>
            <Text style={styles.tagText}>{slide.tag}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{slide.title}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </Animated.View>

        {/* Continue / Get Started button */}
        <Animated.View
          style={[styles.btnWrapper, { transform: [{ scale: btnScale }] }]}
        >
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={1}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={handleContinue}
          >
            <LinearGradient
              colors={[PRIMARY, PRIMARY_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              <Text style={styles.primaryBtnText}>
                {isLast ? 'Get Started' : 'Continue'}
              </Text>
              {!isLast && (
                <View style={styles.arrowCircle}>
                  <Ionicons name="chevron-forward" size={16} color="#fff" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Login link — always rendered to keep button position stable */}
        <TouchableOpacity
          style={[styles.loginBtn, { opacity: isLast ? 1 : 0 }]}
          activeOpacity={0.7}
          onPress={() => isLast && router.replace('/(auth)/login')}
        >
          <Text style={styles.loginText}>Already have an account? </Text>
          <Text style={[styles.loginText, styles.loginTextBold]}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

//     Styles         
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  image: {
    width,
    height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  scrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT + 60,
    // Fade from transparent to white — mimics gradient
    backgroundColor: 'rgba(255,255,255,0.0)',
  },
  // Skip      
  skipBtn: {
    position: 'absolute',
    right: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 10,
  },
  skipText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 0.3,
  },
  // Card      
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 28,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: { elevation: 20 },
    }),
  },
  //  Tag     
  tag: {
    backgroundColor: `${PRIMARY}18`,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 14,
  },
  tagText: {
    color: PRIMARY_DARK,
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 1.2,
  },
  //  Text     
  title: {
    fontSize: 20,
    fontFamily: Fonts.headingBold, 
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 33,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  // Button      
  btnWrapper: {
    width: '100%',
    marginTop: 'auto',
    paddingTop: 20,
  },
  primaryBtn: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
    }),
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.3,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  //  Login      
  loginBtn: {
    flexDirection: 'row',
    marginTop: 16,
    paddingVertical: 4,
  },
  loginText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#64748b',
  },
  loginTextBold: {
    fontFamily: Fonts.bodyBold,
    color: PRIMARY,
  },
});
