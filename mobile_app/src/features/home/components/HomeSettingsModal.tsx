import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import * as WebBrowser from 'expo-web-browser';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenAIInfo: () => void;
  onLogout: () => void;
  musicVolume: number;
  onMusicVolumeChange: (volume: number) => void;
  musicEnabled: boolean;
  onMusicEnabledChange: (enabled: boolean) => void;
}

export function HomeSettingsModal({
  visible,
  onClose,
  onOpenAIInfo,
  onLogout,
  musicVolume,
  onMusicVolumeChange,
  musicEnabled,
  onMusicEnabledChange,
}: Props) {
  const volumePercent = Math.round(musicVolume * 100);
  const activeSegments = Math.round(musicVolume * 10);
  const volumePresets = [0, 0.25, 0.5, 0.75, 1];

  const setVolume = (nextVolume: number) => {
    onMusicVolumeChange(Math.max(0, Math.min(1, nextVolume)));
  };

  const increaseVolume = () => {
    setVolume(musicVolume + 0.05);
  };

  const decreaseVolume = () => {
    setVolume(musicVolume - 0.05);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Paramètres</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.musicRow}>
            <View style={styles.modalItemIcon}>
              <Ionicons name={musicEnabled ? 'musical-notes-outline' : 'volume-mute-outline'} size={20} color={COLORS.textMuted} />
            </View>
            <Text style={styles.modalItemText}>Musique</Text>
            <View style={styles.rightControl}>
              <Switch
                value={musicEnabled}
                onValueChange={onMusicEnabledChange}
                trackColor={{ false: 'rgba(0,0,0,0.15)', true: 'rgba(0, 43, 91, 0.35)' }}
                thumbColor={musicEnabled ? COLORS.primary : '#f4f3f4'}
                ios_backgroundColor="rgba(0,0,0,0.15)"
              />
            </View>
          </View>

          <View style={styles.musicRow}>
            <View style={styles.modalItemIcon}>
              <Ionicons name="volume-high-outline" size={20} color={COLORS.textMuted} />
            </View>
            <Text style={styles.modalItemText}>Volume musique</Text>
            <View style={styles.musicVolumeBlock}>
              <View style={styles.volumeControls}>
                <TouchableOpacity style={styles.volumeButton} onPress={decreaseVolume}>
                  <Ionicons name="remove" size={16} color={COLORS.primary} />
                </TouchableOpacity>

                <View style={styles.segmentedTrack}>
                  {Array.from({ length: 10 }, (_, index) => (
                    <TouchableOpacity
                      key={`segment-${index}`}
                      style={[
                        styles.volumeSegment,
                        index < activeSegments && styles.volumeSegmentActive,
                      ]}
                      onPress={() => setVolume((index + 1) / 10)}
                    />
                  ))}
                </View>

                <TouchableOpacity style={styles.volumeButton} onPress={increaseVolume}>
                  <Ionicons name="add" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.volumeFooterRow}>
                <View style={styles.volumePresetsRow}>
                  {volumePresets.map((preset) => {
                    const selected = Math.abs(musicVolume - preset) < 0.01;
                    return (
                      <TouchableOpacity
                        key={`preset-${preset}`}
                        style={[styles.presetChip, selected && styles.presetChipSelected]}
                        onPress={() => setVolume(preset)}
                      >
                        <Text style={[styles.presetChipText, selected && styles.presetChipTextSelected]}>
                          {Math.round(preset * 100)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.volumeValue}>{volumePercent}%</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
              onClose();
              onOpenAIInfo();
            }}
          >
            <View style={styles.modalItemIcon}>
              <Ionicons name="sparkles-outline" size={20} color={COLORS.accent} />
            </View>
            <Text style={styles.modalItemText}>À propos de l'IA</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
              WebBrowser.openBrowserAsync('https://timalaus.fr/terms');
            }}
          >
            <View style={styles.modalItemIcon}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.textMuted} />
            </View>
            <Text style={styles.modalItemText}>Conditions d'Utilisation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
              WebBrowser.openBrowserAsync('https://timalaus.fr/privacy');
            }}
          >
            <View style={styles.modalItemIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textMuted} />
            </View>
            <Text style={styles.modalItemText}>Confidentialité</Text>
          </TouchableOpacity>

          <View style={styles.modalDivider} />

          <TouchableOpacity
            style={[styles.modalItem, styles.logoutItem]}
            onPress={() => {
              onClose();
              onLogout();
            }}
          >
            <View style={styles.modalItemIcon}>
              <Ionicons name="log-out-outline" size={20} color="#DC3545" />
            </View>
            <Text style={[styles.modalItemText, { color: '#DC3545' }]}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  modalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  rightControl: {
    marginLeft: 'auto',
  },
  musicVolumeBlock: {
    flex: 1,
    marginLeft: 8,
    gap: 8,
  },
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentedTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  volumeSegment: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    backgroundColor: COLORS.divider,
  },
  volumeSegmentActive: {
    backgroundColor: COLORS.primary,
  },
  volumeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  volumeFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volumePresetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetChip: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.surface,
  },
  presetChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 43, 91, 0.12)',
  },
  presetChipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  presetChipTextSelected: {
    color: COLORS.primary,
  },
  volumeValue: {
    minWidth: 44,
    textAlign: 'right',
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 12,
  },
  logoutItem: {
    marginTop: 4,
  },
});
