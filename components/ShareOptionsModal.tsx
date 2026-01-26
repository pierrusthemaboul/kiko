import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShareData, SharePlatform } from '../types/sharing';
import { SOCIAL_PLATFORMS } from '../constants/SocialPlatforms';
import { colors } from '../constants/Colors';
import { isPlatformInstalled } from '../utils/shareScore';

interface ShareOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlatform: (platform: SharePlatform) => void;
  shareData: ShareData;
  loading?: boolean;
  error?: string | null;
}

export const ShareOptionsModal: React.FC<ShareOptionsModalProps> = ({
  visible,
  onClose,
  onSelectPlatform,
  shareData,
  loading = false,
  error = null,
}) => {
  const [slideAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [platformAvailability, setPlatformAvailability] = useState<Record<string, boolean>>({});
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      console.log('[SHARE_MODAL] Modal opened', { from: 'scoreboard' });

      // Check platform availability
      checkPlatformAvailability();

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const checkPlatformAvailability = async () => {
    const availability: Record<string, boolean> = {};

    for (const platform of SOCIAL_PLATFORMS) {
      if (platform.id === 'generic') {
        availability[platform.id] = true;
      } else {
        availability[platform.id] = await isPlatformInstalled(platform.id);
      }
    }

    setPlatformAvailability(availability);
  };

  const handlePlatformSelect = (platform: SharePlatform) => {
    console.log('[SHARE_MODAL] Platform selected', { platform });
    onSelectPlatform(platform);
  };

  const handleClose = () => {
    console.log('[SHARE_MODAL] Modal closed', { shared: false });
    onClose();
  };

  if (!visible) {
    return null;
  }

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [500, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={handleClose} activeOpacity={1} />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY }],
              paddingBottom: Math.max(insets.bottom + 20, 60),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Partager mon score</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={28} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Loading state */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Génération de l'image...</Text>
            </View>
          )}

          {/* Error state */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color={colors.incorrectRed} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => onSelectPlatform('generic')}>
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Platform grid */}
          {!loading && !error && (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.platformGrid}>
                {SOCIAL_PLATFORMS.map((platform) => {
                  const isAvailable = platformAvailability[platform.id] !== false;
                  // Allow sharing even if app not detected - it will open system share
                  const isDisabled = !platform.enabled;

                  return (
                    <TouchableOpacity
                      key={platform.id}
                      style={[
                        styles.platformButton,
                        isDisabled && styles.platformButtonDisabled,
                      ]}
                      onPress={() => handlePlatformSelect(platform.id)}
                      disabled={isDisabled}
                      activeOpacity={0.7}
                    >
                      <Animated.View
                        style={[
                          styles.platformIconContainer,
                          { backgroundColor: platform.color },
                          isDisabled && styles.platformIconDisabled,
                        ]}
                      >
                        <Ionicons
                          name={platform.icon as any}
                          size={32}
                          color={colors.white}
                        />
                      </Animated.View>
                      <Text
                        style={[
                          styles.platformName,
                          isDisabled && styles.platformNameDisabled,
                        ]}
                      >
                        {platform.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: colors.background.light,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    minHeight: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    maxHeight: 500,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  platformButton: {
    width: '47%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background.medium,
    borderWidth: 1,
    borderColor: colors.transparencies.light,
    minHeight: 120,
    justifyContent: 'center',
  },
  platformButtonDisabled: {
    opacity: 0.5,
  },
  platformIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  platformIconDisabled: {
    opacity: 0.6,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
  },
  platformNameDisabled: {
    color: colors.lightText,
  },
  notInstalledText: {
    fontSize: 12,
    color: colors.incorrectRed,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.lightText,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: colors.lightText,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
