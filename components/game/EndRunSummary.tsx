import React from 'react';
import { View, Text, Pressable } from 'react-native';

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

      <Pressable onPress={onClose} style={{ padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 }}>
        <Text>Continuer</Text>
      </Pressable>
    </View>
  );
}
