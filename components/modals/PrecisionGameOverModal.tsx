import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, Animated, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { steampunkTheme } from '../../constants/Colors';
import { useImmersiveMode } from '@/hooks/useImmersiveMode';

interface PrecisionGameOverModalProps {
  isVisible: boolean;
  finalScore: number;
  personalBest: number;
  levelReached: string;
  levelId: number;
  onRestart: () => void;
  onMenuPress: () => void;
  playerName: string;
  dailyScores?: Array<{ name: string; score: number; rank: number }>;
  monthlyScores?: Array<{ name: string; score: number; rank: number }>;
  allTimeScores?: Array<{ name: string; score: number; rank: number }>;
}

const PrecisionGameOverModal: React.FC<PrecisionGameOverModalProps> = ({
  isVisible, finalScore, personalBest, levelReached, levelId, onRestart, onMenuPress, playerName,
  dailyScores = [], monthlyScores = [], allTimeScores = [],
}) => {
  // Activer le mode immersif quand la modale est visible
  useImmersiveMode(isVisible);

  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'allTime'>('daily');
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const isNewHighScore = finalScore > personalBest;

  useEffect(() => {
    if (isVisible) {
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }).start();
    } else {
      scaleAnim.setValue(0);
      setActiveTab('daily');
    }
  }, [isVisible, scaleAnim]);

  const getCurrentScores = () => {
    switch (activeTab) {
      case 'daily': return dailyScores.slice(0, 5);
      case 'monthly': return monthlyScores.slice(0, 5);
      case 'allTime': return allTimeScores.slice(0, 5);
      default: return [];
    }
  };

  const renderScoreRow = (score: { name: string; score: number; rank: number }, index: number) => {
    const isCurrentPlayer = score.name === playerName;
    const medalIcons = ['medal', 'medal', 'medal'];
    const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
    return (
      <View key={`${score.name}-${index}`} style={[styles.scoreRow, isCurrentPlayer && styles.currentPlayerRow]}>
        <View style={styles.rankContainer}>
          {index < 3 ? (
            <Ionicons name={medalIcons[index] as any} size={24} color={medalColors[index]} />
          ) : (
            <Text style={styles.rankText}>#{score.rank || index + 1}</Text>
          )}
        </View>
        <Text style={[styles.playerName, isCurrentPlayer && styles.currentPlayerText]} numberOfLines={1}>{score.name}</Text>
        <Text style={[styles.scoreValue, isCurrentPlayer && styles.currentPlayerText]}>{score.score.toLocaleString()}</Text>
      </View>
    );
  };

  const currentScores = getCurrentScores();

  return (
    <Modal transparent visible={isVisible} animationType="none" statusBarTranslucent>
      <BlurView intensity={Platform.OS === 'ios' ? 20 : 0} tint="dark" style={styles.overlay}>
        <View style={styles.overlayDark} />
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient colors={[steampunkTheme.cardGradient.start, steampunkTheme.cardGradient.end]} style={styles.containerGradient}>
            <View style={styles.header}>
              <LinearGradient colors={[steampunkTheme.cardGradient.start, steampunkTheme.cardGradient.end]} style={styles.headerGradient}>
                <Ionicons name="skull-outline" size={48} color={steampunkTheme.goldAccent} />
                <Text style={styles.title}>Partie Terminée</Text>
              </LinearGradient>
            </View>
            <View style={styles.scoreContainer}>
              <LinearGradient colors={[steampunkTheme.goldGradient.start, steampunkTheme.goldGradient.end]} style={styles.scoreGradient}>
                <Text style={styles.scoreLabel}>Score Final</Text>
                <Text style={styles.score}>{finalScore.toLocaleString()}</Text>
                {isNewHighScore && (
                  <View style={styles.newRecordBadge}>
                    <Ionicons name="trophy" size={20} color={steampunkTheme.mainBg} />
                    <Text style={styles.newRecordText}>Nouveau Record !</Text>
                  </View>
                )}
              </LinearGradient>
            </View>
            <View style={styles.levelBadge}>
              <Ionicons name="ribbon-outline" size={20} color={steampunkTheme.goldAccent} />
              <Text style={styles.levelText}>Niveau {levelId} · {levelReached}</Text>
            </View>
            <View style={styles.tabsContainer}>
              <Pressable style={[styles.tab, activeTab === 'daily' && styles.activeTab]} onPress={() => setActiveTab('daily')}>
                <Ionicons name="today-outline" size={20} color={activeTab === 'daily' ? steampunkTheme.mainBg : steampunkTheme.secondaryText} />
                <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>Jour</Text>
              </Pressable>
              <Pressable style={[styles.tab, activeTab === 'monthly' && styles.activeTab]} onPress={() => setActiveTab('monthly')}>
                <Ionicons name="calendar-outline" size={20} color={activeTab === 'monthly' ? steampunkTheme.mainBg : steampunkTheme.secondaryText} />
                <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>Mois</Text>
              </Pressable>
              <Pressable style={[styles.tab, activeTab === 'allTime' && styles.activeTab]} onPress={() => setActiveTab('allTime')}>
                <Ionicons name="trophy-outline" size={20} color={activeTab === 'allTime' ? steampunkTheme.mainBg : steampunkTheme.secondaryText} />
                <Text style={[styles.tabText, activeTab === 'allTime' && styles.activeTabText]}>Total</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.scoresListContainer} showsVerticalScrollIndicator={false}>
              {currentScores.length > 0 ? currentScores.map((score, index) => renderScoreRow(score, index)) : (
                <View style={styles.noScoresContainer}>
                  <Ionicons name="hourglass-outline" size={40} color={steampunkTheme.secondaryText} />
                  <Text style={styles.noScoresText}>Aucun score disponible</Text>
                </View>
              )}
            </ScrollView>
            {/* Bouton Partager sur TikTok - DEMO MOCKUP */}
            <Pressable
              style={styles.tiktokShareButton}
              onPress={() => {
                // Mockup pour démonstration vidéo TikTok
                console.log('[TIKTOK SHARE] Score:', finalScore, 'Level:', levelReached);
                // Dans la vraie version, ceci ouvrira TikTok Share Kit
                alert('🎯 Score partagé sur TikTok !\n\nScore: ' + finalScore.toLocaleString() + '\nNiveau: ' + levelReached);
              }}
            >
              <LinearGradient colors={['#FF0050', '#000000']} style={styles.tiktokButtonGradient}>
                <Ionicons name="logo-tiktok" size={24} color="#FFFFFF" />
                <Text style={styles.tiktokButtonText}>Partager sur TikTok</Text>
              </LinearGradient>
            </Pressable>

            <View style={styles.buttonContainer}>
              <Pressable style={styles.button} onPress={onRestart}>
                <LinearGradient colors={['#E0B457', '#8C6B2B']} style={styles.buttonGradient}>
                  <Ionicons name="refresh" size={20} color={steampunkTheme.mainBg} />
                  <Text style={styles.buttonText}>Rejouer</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={[styles.button, styles.menuButton]} onPress={onMenuPress}>
                <View style={styles.menuButtonContent}>
                  <Ionicons name="home" size={20} color={steampunkTheme.secondaryText} />
                  <Text style={styles.menuButtonText}>Menu</Text>
                </View>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlayDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.85)' },
  container: { width: '90%', maxWidth: 500, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: steampunkTheme.goldBorder, ...Platform.select({ ios: { shadowColor: steampunkTheme.goldAccent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16 }, android: { elevation: 12 } }) },
  containerGradient: { padding: 20 },
  header: { marginBottom: 20, borderRadius: 15, overflow: 'hidden' },
  headerGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 12 },
  title: { fontSize: 26, fontWeight: 'bold', color: steampunkTheme.primaryText, textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  scoreContainer: { marginBottom: 15, borderRadius: 15, overflow: 'hidden' },
  scoreGradient: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 15 },
  scoreLabel: { fontSize: 14, color: steampunkTheme.mainBg, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  score: { fontSize: 48, fontWeight: 'bold', color: steampunkTheme.mainBg },
  newRecordBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: steampunkTheme.primaryText, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 10, gap: 6 },
  newRecordText: { color: steampunkTheme.mainBg, fontWeight: 'bold', fontSize: 14 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(224, 180, 87, 0.15)', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10, marginBottom: 20, gap: 8, borderWidth: 1, borderColor: steampunkTheme.goldBorderTransparent },
  levelText: { color: steampunkTheme.primaryText, fontSize: 16, fontWeight: '600' },
  tabsContainer: { flexDirection: 'row', backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: 4, borderRadius: 12, marginBottom: 15, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, gap: 6 },
  activeTab: { backgroundColor: steampunkTheme.goldAccent },
  tabText: { fontSize: 13, color: steampunkTheme.secondaryText, fontWeight: '600' },
  activeTabText: { color: steampunkTheme.mainBg, fontWeight: 'bold' },
  scoresListContainer: { maxHeight: 250, marginBottom: 20 },
  noScoresContainer: { padding: 30, alignItems: 'center', gap: 10 },
  noScoresText: { color: steampunkTheme.secondaryText, fontSize: 15, fontStyle: 'italic' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: 'rgba(0, 0, 0, 0.3)', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(200, 160, 74, 0.2)' },
  currentPlayerRow: { backgroundColor: 'rgba(224, 180, 87, 0.2)', borderColor: steampunkTheme.goldBorder, borderWidth: 2 },
  rankContainer: { width: 40, alignItems: 'center' },
  rankText: { fontSize: 16, fontWeight: 'bold', color: steampunkTheme.goldAccent },
  playerName: { flex: 1, fontSize: 16, color: steampunkTheme.primaryText, marginLeft: 10 },
  currentPlayerText: { color: steampunkTheme.goldAccent, fontWeight: 'bold' },
  scoreValue: { fontSize: 16, fontWeight: 'bold', color: steampunkTheme.primaryText, marginLeft: 10 },
  buttonContainer: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, borderRadius: 12, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: 'black', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }, android: { elevation: 4 } }) },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  buttonText: { color: steampunkTheme.mainBg, fontSize: 16, fontWeight: 'bold' },
  menuButton: { backgroundColor: 'rgba(0, 0, 0, 0.4)', borderWidth: 1, borderColor: steampunkTheme.goldBorderTransparent },
  menuButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  menuButtonText: { color: steampunkTheme.secondaryText, fontSize: 16, fontWeight: 'bold' },
  // Styles pour le bouton TikTok
  tiktokShareButton: { borderRadius: 12, overflow: 'hidden', marginBottom: 15, ...Platform.select({ ios: { shadowColor: '#FF0050', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 }, android: { elevation: 6 } }) },
  tiktokButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  tiktokButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
});

export default PrecisionGameOverModal;
