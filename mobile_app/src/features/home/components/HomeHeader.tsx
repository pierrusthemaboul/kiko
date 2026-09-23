import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface Props {
  playerName: string;
  headerSubtitle: string;
  onOpenSettings: () => void;
  isGuest?: boolean;
  onSignUp?: () => void;
  topOffset?: number;
}

export function HomeHeader({ playerName, headerSubtitle, onOpenSettings, isGuest = false, onSignUp, topOffset = 118 }: Props) {
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 375 || height < 700;
  const isVerySmallScreen = width < 340;
  const adjustedTopOffset = topOffset;

  return (
    <View style={[styles.safeArea, { top: adjustedTopOffset }]}>
      <View style={styles.headerSection}>
        <View style={[styles.headerInfo, isVerySmallScreen && styles.headerInfoSmall]}>
          <Text style={[styles.welcomeText, isSmallScreen && styles.welcomeTextSmall, isVerySmallScreen && styles.welcomeTextVerySmall]}>
            {isVerySmallScreen ? 'Bonjour' : `Bonjour, ${playerName}`}
          </Text>
          {!isVerySmallScreen && <Text style={styles.rankBadge}>{headerSubtitle}</Text>}
        </View>
        <View style={styles.headerActions}>
          {isGuest && onSignUp && (
            <TouchableOpacity 
              style={[styles.signUpButton, isSmallScreen && styles.signUpButtonSmall, isVerySmallScreen && styles.signUpButtonVerySmall]} 
              onPress={onSignUp}
            >
              <Ionicons name="person-add-outline" size={isSmallScreen ? 16 : 18} color="#ffffff" />
              {!isVerySmallScreen && (
                <Text style={[styles.signUpButtonText, isSmallScreen && styles.signUpButtonTextSmall]}>
                  S'inscrire
                </Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.settingsIcon, isSmallScreen && styles.settingsIconSmall]} onPress={onOpenSettings}>
            <Ionicons name="settings-outline" size={isSmallScreen ? 20 : 24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerInfoSmall: {
    flex: 0.8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  welcomeTextSmall: {
    fontSize: 20,
  },
  welcomeTextVerySmall: {
    fontSize: 16,
  },
  rankBadge: {
    fontSize: 14,
    color: '#f0f0f0',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F57C00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  signUpButtonSmall: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  signUpButtonVerySmall: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  signUpButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  signUpButtonTextSmall: {
    fontSize: 13,
  },
  settingsIcon: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  settingsIconSmall: {
    padding: 8,
  },
});
