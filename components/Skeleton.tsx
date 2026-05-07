import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';

type Props = {
  width?: number | string;
  height: number;
  radius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height, radius = 8, style }: Props) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[sk.base, { width: width as any, height, borderRadius: radius, opacity }, style]}
    />
  );
}

const sk = StyleSheet.create({
  base: { backgroundColor: '#e2e8f0' },
});
