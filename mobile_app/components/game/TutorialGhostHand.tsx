import React from 'react';
import { Animated, StyleSheet, StyleProp, ViewStyle, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TutorialGhostHandProps {
  style?: StyleProp<ViewStyle>;
  label?: string;
}

export default function TutorialGhostHand({ style, label }: TutorialGhostHandProps) {
  return (
    <Animated.View pointerEvents="none" style={[styles.wrapper, style]}>
      <Animated.View style={styles.container}>
        <Ionicons name="hand-right" size={40} color="rgba(255,255,255,0.92)" />
      </Animated.View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 28, 42, 0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  label: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
