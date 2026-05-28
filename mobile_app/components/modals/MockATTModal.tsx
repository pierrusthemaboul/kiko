import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';

interface MockATTModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function MockATTModal({ visible, onClose }: MockATTModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Text style={styles.title}>
            Autoriser « Timalaus » à suivre vos activités dans les applications et sur les sites web d'autres entreprises ?
          </Text>
          <Text style={styles.message}>
            Cette application utilise des identifiants pour diffuser des publicités personnalisées et analyser l'audience afin d'améliorer votre expérience de jeu.
          </Text>
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.buttonText, styles.primaryButton]}>
              Demander à l'app de ne pas suivre
            </Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.buttonText, styles.boldButton]}>
              Autoriser
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
  title: {
    fontFamily: 'System',
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    paddingTop: 18,
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  message: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
    paddingTop: 4,
    paddingBottom: 18,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#A9A9A9',
  },
  button: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'System',
    fontSize: 17,
    color: '#007AFF',
    textAlign: 'center',
  },
  primaryButton: {
    fontWeight: '400',
  },
  boldButton: {
    fontWeight: '600',
  },
});
