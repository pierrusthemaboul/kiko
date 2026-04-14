import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import * as WebBrowser from 'expo-web-browser';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenAIInfo: () => void;
  onLogout: () => void;
}

export function HomeSettingsModal({ visible, onClose, onOpenAIInfo, onLogout }: Props) {
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
  modalDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 12,
  },
  logoutItem: {
    marginTop: 4,
  },
});
