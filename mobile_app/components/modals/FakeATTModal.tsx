import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';

interface FakeATTModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FakeATTModal({ visible, onClose }: FakeATTModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              Autoriser « Timalaus » à suivre vos activités dans les applications et sur les sites web d'autres entreprises ?
            </Text>
            <Text style={styles.message}>
              Cette application utilise des identifiants pour diffuser des publicités personnalisées et analyser l'audience afin d'améliorer votre expérience.
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.buttonText}>Demander à l'application de ne pas suivre</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.buttonText, styles.boldButtonText]}>Autoriser</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: 270,
    backgroundColor: '#F2F2F2',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  textContainer: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 22,
  },
  message: {
    fontSize: 13,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C8C7CC',
    width: '100%',
  },
  button: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
  },
  buttonText: {
    fontSize: 17,
    color: '#007AFF',
    textAlign: 'center',
  },
  boldButtonText: {
    fontWeight: '600',
  },
});
