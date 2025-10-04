import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseAnalytics } from '@/lib/firebase';
import { useGameLogicA } from '@/hooks/useGameLogicA';
import { rankFromXP } from '@/lib/economy/ranks';

const COLORS = {
  background: '#050505',
  surface: '#111111',
  surfaceAlt: '#181818',
  gold: '#d4af37',
  goldSoft: 'rgba(212, 175, 55, 0.2)',
  textPrimary: '#f5f1d6',
  textMuted: '#b5b1a0',
  divider: '#2a2a2a',
};

const QUESTS = [
  { id: 'streak', label: "Réussir 5 réponses d'affilée", done: false },
  { id: 'precision', label: "Atteindre 80% de précision du jour", done: true },
  { id: 'games', label: "Jouer 3 parties aujourd'hui", done: false },
];


export default function Vue1() {
  const router = useRouter();
  const gameLogic = useGameLogicA();
  const { profile, playsInfo, startRun, canStartRun, leaderboards } = gameLogic;

  const xp = profile?.xp_total ?? 0;
  const rank = useMemo(() => rankFromXP(xp), [xp]);
  const playerName = profile?.display_name ?? 'Voyageur';
  const partiesPerDay = profile?.parties_per_day ?? 3;
  const used = playsInfo?.used ?? 0;
  const remainingSessions = playsInfo?.remaining ?? Math.max(0, partiesPerDay - used);

  const headerSubtitle = useMemo(
    () => `Titre : ${rank.label} · ${xp.toLocaleString('fr-FR')} XP`,
    [rank.label, xp]
  );
  const headerPlays = useMemo(
    () => `${remainingSessions} parties restantes`,
    [remainingSessions]
  );

  const topPlayers = useMemo(() => {
    const src = (leaderboards?.daily ?? leaderboards?.allTime ?? []) as any[];
    return src.slice(0, 5).map((row) => ({
      name: row.display_name ?? row.username ?? 'Anonyme',
      score: row.points ?? row.high_score ?? 0,
    }));
  }, [leaderboards]);

  useEffect(() => {
    FirebaseAnalytics.screen('HomeLuxury', 'Vue1');
  }, []);

  const handleModePress = useCallback(
    async (mode: 'classic' | 'precision') => {
      console.log('[vue1] handleModePress called, mode=', mode);
      console.log('[vue1] canStartRun=', canStartRun);
      console.log('[vue1] playsInfo=', playsInfo);

      if (!canStartRun) {
        const info = playsInfo
          ? `Il vous reste ${Math.max(0, playsInfo.remaining)} partie(s) sur ${playsInfo.allowed}.`
          : "Vous n'avez plus de parties disponibles aujourd'hui.";
        Alert.alert('Plus de parties disponibles', info);
        return;
      }

      const economyMode: 'classic' | 'date' = mode === 'precision' ? 'date' : 'classic';
      const res = await startRun?.(economyMode);
      console.log('[vue1] startRun result =', res);

      if (!res?.ok) {
        Alert.alert('Démarrage impossible', res?.message || 'Erreur inconnue.');
        return;
      }

      router.push(`/game?mode=${mode}`);
    },
    [router, startRun, canStartRun, playsInfo],
  );

  const handleViewLeaderboard = useCallback(() => {
    router.push('/leaderboard');
  }, [router]);

  console.log('[vue1] profile =', profile);
console.log('[vue1] playsInfo =', playsInfo);
console.log('[vue1] leaderboards =', leaderboards);


  return (
    <ImageBackground source={require('@/assets/images/sablier.png')} style={styles.background} resizeMode="cover">
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.welcome}>Bienvenue, {playerName}</Text>
          <Text style={styles.subtitle}>{headerSubtitle}</Text>
          <Text style={styles.subtitle}>{headerPlays}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choisissez votre destin</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeCard, !canStartRun && { opacity: 0.5 }]}
              onPress={() => handleModePress('classic')}
              disabled={!canStartRun}
            >
              <View style={styles.modeIconCircle}>
                <Ionicons name="flash-outline" size={26} color={COLORS.gold} />
              </View>
              <View style={styles.modeContent}>
                <Text style={styles.modeTitle}>Mode Classique</Text>
                <Text style={styles.modeDescription}>Flow équilibré, idéal pour progresser avec style.</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={COLORS.gold} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeCard, !canStartRun && { opacity: 0.5 }]}
              onPress={() => handleModePress('precision')}
              disabled={!canStartRun}
            >
              <View style={styles.modeIconCircle}>
                <Ionicons name="analytics-outline" size={26} color={COLORS.gold} />
              </View>
              <View style={styles.modeContent}>
                <Text style={styles.modeTitle}>Mode Précision</Text>
                <Text style={styles.modeDescription}>Chaque date compte. Visez le coup parfait.</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={COLORS.gold} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quêtes du jour</Text>
          <View style={styles.card}>
            {QUESTS.map((quest, index) => (
              <View key={quest.id} style={[styles.questRow, index < QUESTS.length - 1 && styles.questDivider]}>
                <Text style={styles.questIcon}>{quest.done ? '✅' : '🔒'}</Text>
                <Text style={[styles.questText, quest.done && styles.questTextDone]}>{quest.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Classement</Text>
          <View style={styles.card}>
            {topPlayers.length === 0 ? (
              <Text style={{ color: COLORS.textMuted, paddingVertical: 12 }}>Pas encore de classement</Text>
            ) : (
              topPlayers.map((player, index) => (
                <View key={`${player.name}-${index}`} style={[styles.leaderRow, index < topPlayers.length - 1 && styles.questDivider]}>
                  <View style={styles.leaderRank}>
                    <Text style={styles.leaderRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.leaderInfo}>
                    <Text style={styles.leaderName}>{player.name}</Text>
                    <Text style={styles.leaderScore}>{player.score.toLocaleString('fr-FR')} pts</Text>
                  </View>
                  <Ionicons name="trophy-outline" size={20} color={COLORS.gold} />
                </View>
              ))
            )}
            <TouchableOpacity style={styles.leaderButton} onPress={handleViewLeaderboard}>
              <Text style={styles.leaderButtonText}>Voir tout le classement</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  welcome: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.gold,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.gold,
    marginBottom: 16,
    letterSpacing: 0.4,
  },
  modeRow: {
    gap: 16,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  modeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeContent: {
    flex: 1,
    marginRight: 12,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  questDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  questIcon: {
    width: 28,
    textAlign: 'center',
    marginRight: 12,
    fontSize: 16,
  },
  questText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  questTextDone: {
    color: COLORS.gold,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  leaderRank: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    backgroundColor: COLORS.surfaceAlt,
  },
  leaderRankText: {
    color: COLORS.gold,
    fontWeight: '600',
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  leaderScore: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  leaderButton: {
    marginTop: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingVertical: 12,
    alignItems: 'center',
  },
  leaderButtonText: {
    color: COLORS.gold,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
