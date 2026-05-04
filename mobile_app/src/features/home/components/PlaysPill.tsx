import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface Props {
  headerPlays: string;
  adLoaded: boolean;
  adSuccessLoading: boolean;
  onShowAd: () => void;
  topOffset?: number;
}

export function PlaysPill({ headerPlays, adLoaded, adSuccessLoading, onShowAd, topOffset = 118 }: Props) {
  const { height, width } = useWindowDimensions();
  const isSmallScreen = width < 375 || height < 700;
  const adjustedTopOffset = isSmallScreen ? topOffset + 40 : topOffset;
  return (
    <View style={[styles.playsStatusContainer, { top: adjustedTopOffset }]}>
      <View style={styles.playsPill}>
        <Ionicons name="time-outline" size={16} color={COLORS.primary} />
        <Text style={styles.playsPillText}>{headerPlays}</Text>
      </View>
      <TouchableOpacity
        style={[styles.addPlayButton, (!adLoaded || adSuccessLoading) && { opacity: 0.5 }]}
        onPress={onShowAd}
        disabled={!adLoaded || adSuccessLoading}
      >
        <Ionicons name="gift-outline" size={18} color={COLORS.accent} />
        <Text style={styles.addPlayText}>Extra Play</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  playsStatusContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  playsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  playsPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  addPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.accent,
    gap: 8,
  },
  addPlayText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accent,
  },
});
