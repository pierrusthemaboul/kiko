import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PendingReward } from '@/hooks/useLeaderboardRewards';

const COLORS = {
  background: '#FAF7F2',
  surface: '#FFFFFF',
  primary: '#002B5B',
  accent: '#A67C1F',
  gold: '#D4AF37',
  goldSoft: 'rgba(212, 175, 55, 0.12)',
  textPrimary: '#1C1C1C',
  textMuted: '#7A7267',
  divider: '#E8E1D5',
};

const PERIOD_LABELS: Record<string, string> = {
  daily: 'Classement du jour',
  weekly: 'Classement de la semaine',
  monthly: 'Classement du mois',
};

const RANK_EMOJIS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
  4: '🏅',
  5: '🏅',
};

interface LeaderboardRewardModalProps {
  visible: boolean;
  rewards: PendingReward[];
  onClaim: (periodType: string, periodKey: string) => Promise<void>;
  onClaimAll: () => Promise<void>;
  claiming: boolean;
  onClose: () => void;
}

export default function LeaderboardRewardModal({
  visible,
  rewards,
  onClaim,
  onClaimAll,
  claiming,
  onClose,
}: LeaderboardRewardModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (rewards.length === 0) return null;

  const totalPlays = rewards.reduce((sum, r) => sum + r.playsAvailable, 0);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="trophy" size={48} color={COLORS.gold} />
          </View>

          <Text style={styles.title}>
            Récompenses de classement
          </Text>
          <Text style={styles.subtitle}>
            Bravo ! Vous avez été bien classé.
          </Text>

          <View style={styles.separator} />

          {rewards.map((reward) => (
            <View key={`${reward.periodType}-${reward.periodKey}`} style={styles.rewardRow}>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardEmoji}>
                  {RANK_EMOJIS[reward.rank] || '🏅'}
                </Text>
                <View style={styles.rewardTextContainer}>
                  <Text style={styles.rewardPeriod}>
                    {PERIOD_LABELS[reward.periodType] || reward.periodType}
                  </Text>
                  <Text style={styles.rewardRank}>
                    {reward.rank === 1 ? '1er' : `${reward.rank}e`} place
                  </Text>
                </View>
              </View>
              <View style={styles.rewardBadge}>
                <Text style={styles.rewardPlays}>+{reward.playsAvailable}</Text>
                <Ionicons name="game-controller-outline" size={14} color={COLORS.accent} />
              </View>
            </View>
          ))}

          <View style={styles.separator} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>+{totalPlays} parties</Text>
          </View>

          <TouchableOpacity
            style={[styles.claimButton, claiming && styles.claimButtonDisabled]}
            onPress={onClaimAll}
            disabled={claiming}
            activeOpacity={0.8}
          >
            {claiming ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.claimButtonText}>
                Récupérer mes récompenses
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Plus tard</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 16,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  rewardEmoji: {
    fontSize: 28,
  },
  rewardTextContainer: {
    flex: 1,
  },
  rewardPeriod: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rewardRank: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.goldSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  rewardPlays: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.accent,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  claimButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
