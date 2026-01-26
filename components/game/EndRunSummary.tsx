import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type RankInfo = { key: string; label: string; partiesPerDay: number };

export type EndRunSummaryProps = {
  mode: 'classic' | 'date';
  points: number;
  result: {
    xpEarned: number;
    newXp: number;
    rank: RankInfo;
    leveledUp: boolean;
  };
  next?: { label: string; xpNeeded: number; pct: number } | null;
  onClose: () => void;
};

export default function EndRunSummary({ mode, points, result, next, onClose }: EndRunSummaryProps) {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Récapitulatif</Text>
      <Text>Mode : {mode === 'classic' ? 'Classique' : 'Date'}</Text>
      <Text>Points → XP : {points} → {result.xpEarned}</Text>

      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{result.rank.label}</Text>
        <Text>Parties/jour : {result.rank.partiesPerDay}</Text>
        {result.leveledUp && <Text style={{ fontWeight: '700' }}>🎉 Nouveau titre !</Text>}
      </View>

      {next && (
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12 }}>Prochain titre : {next.label}</Text>
          <View style={{ height: 8, borderRadius: 8, backgroundColor: '#eee' }}>
            <View style={{ width: `${Math.max(0, Math.min(100, next.pct))}%`, height: 8, borderRadius: 8, backgroundColor: '#999' }} />
          </View>
        </View>
      )}

      {/* Bouton Partager sur TikTok - DEMO MOCKUP */}
      <Pressable
        onPress={() => {
          console.log('[TIKTOK SHARE] Points:', points, 'Rank:', result.rank.label);
          Alert.alert(
            '🎯 Score partagé sur TikTok !',
            `Points: ${points.toLocaleString()}\nTitre: ${result.rank.label}`
          );
        }}
        style={styles.tiktokShareButton}
      >
        <LinearGradient colors={['#FF0050', '#000000']} style={styles.tiktokButtonGradient}>
          <Ionicons name="logo-tiktok" size={24} color="#FFFFFF" />
          <Text style={styles.tiktokButtonText}>Partager sur TikTok</Text>
        </LinearGradient>
      </Pressable>

      <Pressable onPress={onClose} style={{ padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 }}>
        <Text>Continuer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tiktokShareButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 10,
    elevation: 6,
    shadowColor: '#FF0050',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  tiktokButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  tiktokButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
