import React, { useState, useRef, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Alert,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShareData, SharePlatform } from '../types/sharing';
import { ShareOptionsModal } from './ShareOptionsModal';
import { ScoreCard } from './ScoreCard';
import { generateScoreImage } from '../utils/generateScoreImage';
import { shareTo } from '../utils/shareScore';
import { colors } from '../constants/Colors';

interface ShareScoreButtonProps {
  scoreData: ShareData;
  onShareComplete?: (success: boolean, platform?: SharePlatform) => void;
  style?: any;
}

export const ShareScoreButton: React.FC<ShareScoreButtonProps> = ({
  scoreData,
  onShareComplete,
  style,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const scoreCardRef = useRef(null);

  const handlePress = () => {
    console.log('[SHARE_BUTTON] Button pressed', { context: 'scoreboard' });

    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setModalVisible(true);
    setError(null);
  };

  const handleSelectPlatform = useCallback(
    async (platform: SharePlatform) => {
      setLoading(true);
      setError(null);

      try {
        // Generate score image
        const imageUri = await generateScoreImage(scoreCardRef, scoreData);

        // Share to selected platform
        const result = await shareTo(platform, scoreData, imageUri);

        setLoading(false);

        if (result.success) {
          // Show success animation
          setShowSuccess(true);
          Animated.sequence([
            Animated.timing(successAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.delay(1500),
            Animated.timing(successAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setShowSuccess(false);
            setModalVisible(false);
          });

          console.log('[SHARE_BUTTON] Share completed', {
            platform,
            success: true,
          });

          onShareComplete?.(true, platform);
        } else if (result.cancelled) {
          // User cancelled - just close modal
          setModalVisible(false);
        } else {
          // Show error
          setError(
            result.error ||
              'Une erreur est survenue lors du partage. Veuillez réessayer.'
          );
          onShareComplete?.(false, platform);
        }
      } catch (err) {
        setLoading(false);
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Impossible de générer l\'image de partage';
        setError(errorMessage);

        console.error('[SHARE_BUTTON] Share error', {
          error: errorMessage,
        });

        onShareComplete?.(false);
      }
    },
    [scoreData, onShareComplete]
  );

  const handleCloseModal = () => {
    if (!loading) {
      setModalVisible(false);
      setError(null);
    }
  };

  return (
    <>
      {/* Invisible ScoreCard for image generation */}
      <View style={styles.hiddenContainer}>
        <ScoreCard ref={scoreCardRef} data={scoreData} />
      </View>

      {/* Share Button */}
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <TouchableOpacity
          style={styles.button}
          onPress={handlePress}
          activeOpacity={0.8}
          disabled={loading}
        >
          <Ionicons name="share-social" size={20} color={colors.white} />
          <Text style={styles.buttonText}>Partager</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Success indicator */}
      {showSuccess && (
        <Animated.View
          style={[
            styles.successContainer,
            {
              opacity: successAnim,
              transform: [
                {
                  scale: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.successBadge}>
            <Ionicons name="checkmark-circle" size={48} color={colors.correctGreen} />
            <Text style={styles.successText}>Partagé !</Text>
          </View>
        </Animated.View>
      )}

      {/* Share Options Modal */}
      <ShareOptionsModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSelectPlatform={handleSelectPlatform}
        shareData={scoreData}
        loading={loading}
        error={error}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 48,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  hiddenContainer: {
    position: 'absolute',
    left: -10000,
    top: -10000,
    opacity: 0,
    pointerEvents: 'none',
  },
  successContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 9999,
  },
  successBadge: {
    backgroundColor: colors.background.light,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  successText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
});
